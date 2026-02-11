'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { authService, chatService, eventService } from '@/lib/services';

export default function PatientDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [message, setMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchSummary, setSearchSummary] = useState('');
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [aiResponse, setAiResponse] = useState('');
    const [reminderAlert, setReminderAlert] = useState<any>(null);
    const eventsRef = useRef<any[]>([]);

    // Keep ref in sync with state for polling
    useEffect(() => {
        eventsRef.current = events;
    }, [events]);

    // Event creation
    const [eventForm, setEventForm] = useState({
        title: '',
        description: '',
        datetime: '',
        importance: 'medium' as 'low' | 'medium' | 'high',
        reminderOffsets: [15],
    });

    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        if (!currentUser || currentUser.role !== 'patient') {
            router.push('/');
            return;
        }
        setUser(currentUser);
        loadData();

        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        // Poll for reminders every 10 seconds
        const interval = setInterval(async () => {
            try {
                const latestEvents = await eventService.getAll();

                // Compare with previous events to find NEWly sent reminders
                latestEvents.forEach((newEvent: any) => {
                    const oldEvent = eventsRef.current.find((e: any) => e._id === newEvent._id);
                    // If visual status changed from pending -> sent, OR if we just want to catch any 'sent' event that we haven't acknowledged (simplified: just status change)
                    if (oldEvent && oldEvent.reminderStatus === 'pending' && newEvent.reminderStatus === 'sent') {
                        triggerReminder(newEvent);
                    }
                });

                // Update state and ref
                setEvents(latestEvents);
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 10000);

        return () => clearInterval(interval);
    }, [router]);

    const triggerReminder = (event: any) => {
        // 1. Browser Notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('⏰ Event Reminder', {
                body: `${event.title} is happening soon!`,
                icon: '/favicon.ico'
            });
        }

        // 2. In-App Modal
        setReminderAlert(event);
    };

    const loadData = async () => {
        try {
            const [chatData, eventsData] = await Promise.all([
                chatService.getHistory(10),
                eventService.getAll(),
            ]);
            setChatHistory(chatData.thoughts || []);
            setEvents(eventsData || []);
        } catch (error) {
            console.error('Error loading data:', error);
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        setLoading(true);
        try {
            const response = await chatService.sendMessage(message);
            setAiResponse(response.response);
            setChatHistory([response.thought, ...chatHistory]);
            setMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setLoading(false);
        }
    };

    const searchMemories = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        try {
            const results = await chatService.search(searchQuery);
            setSearchSummary(results.summary || '');
            setSearchResults(results.results || []);
        } catch (error) {
            console.error('Error searching:', error);
        }
    };

    const createEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await eventService.create(eventForm);
            setEventForm({
                title: '',
                description: '',
                datetime: '',
                importance: 'medium',
                reminderOffsets: [15],
            });
            loadData();
        } catch (error) {
            console.error('Error creating event:', error);
        }
    };

    const deleteEvent = async (id: string) => {
        try {
            await eventService.delete(id);
            loadData();
        } catch (error) {
            console.error('Error deleting event:', error);
        }
    };

    const logout = () => {
        authService.logout();
        router.push('/');
    };

    return (
        <div className="min-h-screen bg-neutral-50 p-4">
            <div className="mx-auto max-w-6xl space-y-4">
                {/* Header */}
                <Card>
                    <CardContent className="flex items-center justify-between p-4">
                        <div>
                            <h1 className="text-2xl font-bold">Patient Dashboard</h1>
                            <p className="text-sm text-neutral-500">Welcome, {user?.name}</p>
                        </div>
                        <Button variant="outline" onClick={logout}>
                            Logout
                        </Button>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                    {/* Chat Interface */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>Memory Chat</CardTitle>
                            <CardDescription>Share your thoughts and get AI assistance</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <form onSubmit={sendMessage} className="space-y-2">
                                <Textarea
                                    placeholder="Tell me about your day... Ask me anything!"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={3}
                                />
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? 'Sending...' : 'Send Message'}
                                </Button>
                            </form>

                            {aiResponse && (
                                <Card className="bg-blue-50 border-blue-200">
                                    <CardContent className="p-4">
                                        <p className="text-sm font-semibold text-blue-900 mb-2">AI Response:</p>
                                        <p className="text-sm text-blue-800">{aiResponse}</p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Search */}
                            <form onSubmit={searchMemories} className="flex gap-2">
                                <Input
                                    placeholder="Search your memories..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <Button type="submit">Search</Button>
                            </form>

                            {searchSummary && (
                                <Card className="bg-green-50 border-green-200">
                                    <CardContent className="p-4">
                                        <p className="text-sm font-semibold text-green-900 mb-2">Search Summary:</p>
                                        <p className="text-sm text-green-800">{searchSummary}</p>
                                    </CardContent>
                                </Card>
                            )}

                            {searchResults.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="text-sm font-semibold">Related Memories</h3>
                                    {searchResults.map((result: any, index: number) => (
                                        <Card key={result.thought?._id || `search-${index}`} className="p-3">
                                            <p className="text-sm">{result.thought?.rawText}</p>
                                            {result.thought?.entities && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {result.thought.entities.people?.map((person: string, i: number) => (
                                                        <Badge key={`sp-${index}-${i}`} variant="secondary">
                                                            👤 {person}
                                                        </Badge>
                                                    ))}
                                                    {result.thought.entities.activities?.map((act: string, i: number) => (
                                                        <Badge key={`sa-${index}-${i}`} variant="outline">
                                                            ⚡ {act}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="text-xs text-neutral-500 mt-1">
                                                {new Date(result.thought?.timestamp).toLocaleString()} · Relevance: {(result.score * 100).toFixed(0)}%
                                            </p>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold">Recent Memories</h3>
                                <div className="max-h-96 space-y-2 overflow-y-auto">
                                    {chatHistory.map((thought, index) => (
                                        <Card key={thought._id || thought.qdrantId || `thought-${index}`} className="p-3">
                                            <p className="text-sm">{thought.rawText}</p>
                                            {thought.entities && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {thought.entities.people?.map((person: string, i: number) => (
                                                        <Badge key={`person-${index}-${i}`} variant="secondary">
                                                            👤 {person}
                                                        </Badge>
                                                    ))}
                                                    {thought.entities.activities?.map((activity: string, i: number) => (
                                                        <Badge key={`activity-${index}-${i}`} variant="outline">
                                                            ⚡ {activity}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="text-xs text-neutral-500 mt-1">
                                                {new Date(thought.timestamp).toLocaleString()}
                                            </p>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Events */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Upcoming Events</CardTitle>
                                    <CardDescription>Your scheduled appointments</CardDescription>
                                </div>
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button>+ Add Event</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Create Event</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={createEvent} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Title</Label>
                                                <Input
                                                    required
                                                    value={eventForm.title}
                                                    onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Description</Label>
                                                <Textarea
                                                    value={eventForm.description}
                                                    onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Date & Time</Label>
                                                <Input
                                                    type="datetime-local"
                                                    required
                                                    value={eventForm.datetime}
                                                    onChange={(e) => setEventForm({ ...eventForm, datetime: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Importance</Label>
                                                <div className="flex gap-2">
                                                    {(['low', 'medium', 'high'] as const).map((level) => (
                                                        <Button
                                                            key={level}
                                                            type="button"
                                                            variant={eventForm.importance === level ? 'default' : 'outline'}
                                                            onClick={() => setEventForm({ ...eventForm, importance: level })}
                                                            className="flex-1"
                                                        >
                                                            {level}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                            <Button type="submit" className="w-full">
                                                Create Event
                                            </Button>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-2 md:grid-cols-2">
                                {events.map((event) => (
                                    <Card key={event._id} className="p-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h4 className="font-semibold">{event.title}</h4>
                                                {event.description && (
                                                    <p className="text-sm text-neutral-600">{event.description}</p>
                                                )}
                                                <p className="text-sm text-neutral-500 mt-1">
                                                    {new Date(event.datetime).toLocaleString()}
                                                </p>
                                                <Badge className="mt-2" variant={
                                                    event.importance === 'high' ? 'destructive' :
                                                        event.importance === 'medium' ? 'default' : 'secondary'
                                                }>
                                                    {event.importance}
                                                </Badge>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => deleteEvent(event._id)}
                                            >
                                                ✕
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                                {events.length === 0 && (
                                    <p className="text-sm text-neutral-500 col-span-2">No upcoming events</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Reminder Alert Dialog */}
                <Dialog open={!!reminderAlert} onOpenChange={() => setReminderAlert(null)}>
                    <DialogContent className="sm:max-w-[425px] border-l-4 border-l-red-500">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                ⏰ Reminder Alert!
                            </DialogTitle>
                            <CardDescription>
                                {new Date().toLocaleTimeString()}
                            </CardDescription>
                        </DialogHeader>
                        {reminderAlert && (
                            <div className="space-y-4 py-4">
                                <div>
                                    <h3 className="font-bold text-lg">{reminderAlert.title}</h3>
                                    <p className="text-sm text-neutral-500">
                                        {new Date(reminderAlert.datetime).toLocaleString()}
                                    </p>
                                </div>
                                {reminderAlert.description && (
                                    <p className="text-neutral-700 bg-neutral-100 p-3 rounded-md">
                                        {reminderAlert.description}
                                    </p>
                                )}
                                <Button
                                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                                    onClick={() => setReminderAlert(null)}
                                >
                                    Acknowledge
                                </Button>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
