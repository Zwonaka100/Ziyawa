export type EventTeamRole = 'door_staff' | 'guest_list_staff' | 'event_ops'

export interface EventAccessPermissions {
  canCheckIn: boolean
  canManageGuestList: boolean
  canViewAttendees: boolean
  canSendEventUpdates: boolean
  canManageTeam: boolean
  canViewSensitiveFinancials: boolean
}

export const EVENT_TEAM_ROLE_LABELS: Record<EventTeamRole, string> = {
  door_staff: 'Door Staff',
  guest_list_staff: 'Guest List Staff',
  event_ops: 'Event Ops Lead',
}

const NO_ACCESS_PERMISSIONS: EventAccessPermissions = {
  canCheckIn: false,
  canManageGuestList: false,
  canViewAttendees: false,
  canSendEventUpdates: false,
  canManageTeam: false,
  canViewSensitiveFinancials: false,
}

const ORGANIZER_PERMISSIONS: EventAccessPermissions = {
  canCheckIn: true,
  canManageGuestList: true,
  canViewAttendees: true,
  canSendEventUpdates: true,
  canManageTeam: true,
  canViewSensitiveFinancials: true,
}

const TEAM_ROLE_PERMISSIONS: Record<EventTeamRole, EventAccessPermissions> = {
  door_staff: {
    canCheckIn: true,
    canManageGuestList: false,
    canViewAttendees: true,
    canSendEventUpdates: false,
    canManageTeam: false,
    canViewSensitiveFinancials: false,
  },
  guest_list_staff: {
    canCheckIn: true,
    canManageGuestList: true,
    canViewAttendees: true,
    canSendEventUpdates: false,
    canManageTeam: false,
    canViewSensitiveFinancials: false,
  },
  event_ops: {
    canCheckIn: true,
    canManageGuestList: true,
    canViewAttendees: true,
    canSendEventUpdates: true,
    canManageTeam: false,
    canViewSensitiveFinancials: false,
  },
}

export function getEventRoleLabel(role?: string | null) {
  if (!role) return 'Event Team'
  return EVENT_TEAM_ROLE_LABELS[role as EventTeamRole] || 'Event Team'
}

export function getPermissionsForRole(role?: string | null): EventAccessPermissions {
  if (!role) return NO_ACCESS_PERMISSIONS
  return TEAM_ROLE_PERMISSIONS[role as EventTeamRole] || NO_ACCESS_PERMISSIONS
}

export function getNoAccessPermissions(): EventAccessPermissions {
  return NO_ACCESS_PERMISSIONS
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getEventAccessForUser(supabase: any, eventId: string, userId: string) {
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, title, organizer_id, event_date, start_time, venue')
    .eq('id', eventId)
    .single()

  if (eventError || !event) {
    return {
      event: null,
      role: null,
      status: 'missing',
      isOwner: false,
      isTeamMember: false,
      permissions: getNoAccessPermissions(),
      member: null,
    }
  }

  if (event.organizer_id === userId) {
    return {
      event,
      role: 'organizer_owner',
      status: 'active',
      isOwner: true,
      isTeamMember: false,
      permissions: ORGANIZER_PERMISSIONS,
      member: null,
    }
  }

  const { data: member, error: memberError } = await supabase
    .from('event_team_members')
    .select('id, role, status, expires_at, created_at')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (memberError) {
    if (memberError.code === 'PGRST205' || memberError.code === '42P01') {
      return {
        event,
        role: null,
        status: 'inactive',
        isOwner: false,
        isTeamMember: false,
        permissions: getNoAccessPermissions(),
        member: null,
      }
    }

    throw memberError
  }

  if (!member) {
    return {
      event,
      role: null,
      status: 'inactive',
      isOwner: false,
      isTeamMember: false,
      permissions: getNoAccessPermissions(),
      member: null,
    }
  }

  const isExpired = Boolean(member.expires_at && new Date(member.expires_at).getTime() < Date.now())
  const isActive = member.status === 'active' && !isExpired

  return {
    event,
    role: member.role,
    status: isActive ? 'active' : member.status,
    isOwner: false,
    isTeamMember: true,
    permissions: isActive ? getPermissionsForRole(member.role) : getNoAccessPermissions(),
    member,
  }
}
