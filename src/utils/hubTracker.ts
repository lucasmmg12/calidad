/**
 * Hub Session Tracker — Sanatorio Argentino (Calidad)
 * 
 * Usa un cliente Supabase dedicado al Hub (NO el de Calidad)
 * porque hub_logs_sesion vive en el proyecto Supabase del Hub.
 */
import { createClient } from '@supabase/supabase-js'

const CALIDAD_SISTEMA_ID = '646c05c8-edbb-4201-8aa9-fb8bae8449f1'

// Cliente dedicado al Hub
const HUB_SUPABASE_URL = import.meta.env.VITE_HUB_SUPABASE_URL
const HUB_SUPABASE_ANON_KEY = import.meta.env.VITE_HUB_SUPABASE_ANON_KEY

let hubClient = null
function getHubClient() {
  if (!HUB_SUPABASE_URL || !HUB_SUPABASE_ANON_KEY) {
    console.warn('[HubTracker] Missing VITE_HUB_SUPABASE_URL or VITE_HUB_SUPABASE_ANON_KEY')
    return null
  }
  if (!hubClient) {
    hubClient = createClient(HUB_SUPABASE_URL, HUB_SUPABASE_ANON_KEY)
  }
  return hubClient
}

async function getPublicIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json')
    const data = await res.json()
    return data.ip || null
  } catch { return null }
}

function getGeoLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
    )
  })
}

export async function trackLogin(supabase, userId) {
  try {
    const hub = getHubClient()
    if (!hub) return

    const [ip, geo] = await Promise.all([getPublicIP(), getGeoLocation()])
    await hub.from('hub_logs_sesion').insert({
      user_id: userId,
      evento: 'login',
      sistema_id: CALIDAD_SISTEMA_ID,
      ip_address: ip,
      user_agent: navigator.userAgent,
      latitud: geo?.lat || null,
      longitud: geo?.lng || null,
      metadata: { source: 'calidad' },
    })
  } catch (e) { console.warn('[HubTracker] Error:', e) }
}

export async function trackLogout(supabase, userId) {
  try {
    const hub = getHubClient()
    if (!hub) return

    await hub.from('hub_logs_sesion').insert({
      user_id: userId,
      evento: 'logout',
      sistema_id: CALIDAD_SISTEMA_ID,
      user_agent: navigator.userAgent,
      metadata: { source: 'calidad' },
    })
  } catch (e) { console.warn('[HubTracker] Error:', e) }
}
