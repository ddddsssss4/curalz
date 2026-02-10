import cron from 'node-cron';
import Event from '../models/Event';

// Run every minute
const checkReminders = cron.schedule('* * * * *', async () => {
    console.log('Checking for reminders...');
    const now = new Date();

    // Find events where reminderStatus is pending
    // Logic: For each event, check if any offset matches current time window
    // For MVP, we'll simpler logic: Find events happening in the next hour that haven't been sent

    try {
        // Logic for exact offset matching is complex for MVP cron.
        // Simplified: Find events exactly now or in the past minute + offset.
        // Better MVP approach: Find events happening soon.

        const upcomingEvents = await Event.find({
            datetime: { $gte: now },
            reminderStatus: 'pending'
        }).populate('userId', 'email name');

        for (const event of upcomingEvents) {
            const timeDiff = event.datetime.getTime() - now.getTime();
            const minutesUntil = Math.floor(timeDiff / 1000 / 60);

            // Check if any offset matches "minutesUntil" (with some tolerance)
            // or if it's "close enough" and we just want to send ONE reminder for now.

            if (event.reminderOffsets && event.reminderOffsets.length > 0) {
                for (const offset of event.reminderOffsets) {
                    if (Math.abs(minutesUntil - offset) <= 1) { // 1 minute tolerance
                        console.log(`[REMINDER] Sending reminder for event "${event.title}" to ${event.userId}`);
                        // Here we would trigger an email/push notification

                        // Update status to avoid spamming (simplification for MVP: just mark sent)
                        // Ideally we track WHICH offset was sent.
                        event.reminderStatus = 'sent';
                        await event.save();
                        break;
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error in reminder job:', error);
    }
});

export default checkReminders;
