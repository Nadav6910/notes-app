import { useEffect, useState } from 'react'
import { ably } from '../../lib/Ably/Ably' // Your Ably instance
import { clientId } from '@/lib/Ably/Ably';

// The hook accepts a channel name and an optional callback function
export default function useChannelOccupancy(
  channelName: string,
  onPresenceEvent?: ( clientId: string, action: string ) => void
) {
  const [occupancy, setOccupancy] = useState<number>(0)
  const channel = ably.channels.get(channelName)

  useEffect(() => {
    // Enter presence so this client is counted.
    channel.presence.enter({ message: 'joined' }).catch((err: Error) => {
      console.error('Error entering presence:', err)
    })

    // Function to update occupancy count
    const updateOccupancy = () => {
      channel.presence.get()
        .then((members) => {
          setOccupancy(members.length)
        })
        .catch((err: Error) => {
          console.error('Error fetching presence:', err)
        })
    }

    // Get initial occupancy
    updateOccupancy()

    // Subscribe to presence events.
    // This subscription will call the passed callback (if provided)
    channel.presence.subscribe((presenceMessage) => {
      if (onPresenceEvent) {
        const { clientId, action } = presenceMessage
        onPresenceEvent(clientId, action)
      }
      updateOccupancy()
    })

    // Cleanup: unsubscribe and leave presence when the component unmounts.
    return () => {
        channel.presence.unsubscribe()
        channel.presence.leave()
    }
  }, [channel, onPresenceEvent])

  return occupancy
}