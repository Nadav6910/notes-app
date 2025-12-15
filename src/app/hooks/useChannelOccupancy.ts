import { useEffect, useState, useRef, useCallback } from 'react'
import { ably, clientId } from '../../lib/Ably/Ably'

// The hook accepts a channel name and an optional callback function
export default function useChannelOccupancy(
  channelName: string,
  onPresenceEvent?: (incomingClientId: string, action: string) => void
) {
  const [occupancy, setOccupancy] = useState<number>(0)
  const channelRef = useRef(ably.channels.get(channelName))
  const hasEnteredRef = useRef(false)
  
  // Memoize the callback to avoid re-running effect
  const onPresenceEventRef = useRef(onPresenceEvent)
  onPresenceEventRef.current = onPresenceEvent

  useEffect(() => {
    const channel = channelRef.current
    let isMounted = true

    // Function to update occupancy count
    const updateOccupancy = async () => {
      try {
        const members = await channel.presence.get()
        if (isMounted) {
          setOccupancy(members.length)
        }
      } catch (err) {
        console.error('Error fetching presence:', err)
      }
    }

    // Presence event handler
    const handlePresence = (presenceMessage: any) => {
      if (!isMounted) return
      
      const { clientId: incomingId, action } = presenceMessage
      
      // Only notify for other users, not self
      if (incomingId !== clientId && onPresenceEventRef.current) {
        onPresenceEventRef.current(incomingId, action)
      }
      
      // Update occupancy after any presence change
      updateOccupancy()
    }

    // Leave presence handler for page unload
    const leavePresence = () => {
      if (hasEnteredRef.current) {
        // Suppress all errors during unload - can't handle them anyway
        try {
          // Check if connection is still available
          if (channel && channel.presence) {
            channel.presence.leave()
          }
        } catch (err) {
          // Silently ignore - page is unloading
        }
      }
    }

    // Enter presence
    const enterPresence = async () => {
      try {
        await channel.presence.enter({ message: 'joined' })
        hasEnteredRef.current = true
        updateOccupancy()
      } catch (err) {
        console.error('Error entering presence:', err)
      }
    }

    enterPresence()
    
    // Subscribe to presence events
    channel.presence.subscribe(handlePresence)

    // Add beforeunload handler to leave presence on refresh/close
    // Only in browser environment
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', leavePresence)
      window.addEventListener('pagehide', leavePresence)
    }

    // Cleanup
    return () => {
      isMounted = false
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', leavePresence)
        window.removeEventListener('pagehide', leavePresence)
      }
      channel.presence.unsubscribe(handlePresence)
      if (hasEnteredRef.current) {
        channel.presence.leave().catch(() => {})
        hasEnteredRef.current = false
      }
    }
  }, [channelName])

  return occupancy
}