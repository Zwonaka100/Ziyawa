import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
	try {
		const supabase = await createClient()
		const { data: { user } } = await supabase.auth.getUser()

		if (!user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
		}

		const { data: profile } = await supabase
			.from('profiles')
			.select('id, is_provider, is_organizer')
			.eq('id', user.id)
			.single()

		if (!profile) {
			return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
		}

		if (profile.is_provider) {
			const { data: provider } = await supabase
				.from('providers')
				.select('id')
				.eq('profile_id', user.id)
				.single()

			if (!provider) {
				return NextResponse.json({ bookings: [] })
			}

			const { data: bookings, error } = await supabase
				.from('provider_bookings')
				.select('id, state, offered_amount, final_amount, event_id, organizer_id, provider_id, created_at, updated_at')
				.eq('provider_id', provider.id)
				.order('created_at', { ascending: false })

			if (error) {
				return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 })
			}

			return NextResponse.json({ bookings: bookings || [] })
		}

		if (profile.is_organizer) {
			const { data: bookings, error } = await supabase
				.from('provider_bookings')
				.select('id, state, offered_amount, final_amount, event_id, organizer_id, provider_id, created_at, updated_at')
				.eq('organizer_id', user.id)
				.order('created_at', { ascending: false })

			if (error) {
				return NextResponse.json({ error: 'Failed to load bookings' }, { status: 500 })
			}

			return NextResponse.json({ bookings: bookings || [] })
		}

		return NextResponse.json({ bookings: [] })
	} catch (error) {
		console.error('Provider bookings list error:', error)
		return NextResponse.json({ error: 'Failed to load provider bookings' }, { status: 500 })
	}
}
