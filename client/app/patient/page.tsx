'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { authService, chatService, eventService } from '@/lib/services';

export default function PatientDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [message, setMessage] = useState('');
    const [chat, setChat] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        if (!currentUser || currentUser.role !== 'patient') {
            router.push('/');
            return;
        }
        setUser(currentUser);
        loadData();
    }, [router]);

    const loadData = async () => {
        try {
            const [chatData, eventsData] = await Promise.all([
                chatService.getHistory(10),
                eventService.getAll(),
            ]);
            setChat(chatData.thoughts || []);
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
            setChat([response.thought, ...chat]);
            setMessage('');
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setLoading(false);
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
                    <Card>
                        <CardHeader>
                            <CardTitle>Memory Chat</CardTitle>
                            <CardDescription>Share your thoughts and memories</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <form onSubmit={sendMessage} className="space-y-2">
                                <Textarea
                                    placeholder="Tell me about your day..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={3}
                                />
                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? 'Sending...' : 'Send Message'}
                                </Button>
                            </form>

                            <div className="space-y-2">
                                <h3 className="text-sm font-semibold">Recent Memories</h3>
                                <div className="max-h-96 space-y-2 overflow-y-auto">
                                    {chat.map((thought) => (
                                        <Card key={thought._id} className="p-3">
                                            <p className="text-sm">{thought.rawText}</p>
                                            {thought.entities && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {thought.entities.people?.map((person: string) => (
                                                        <Badge key={person} variant="secondary">
                                                            {person}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Events */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Upcoming Events</CardTitle>
                            <CardDescription>Your scheduled appointments</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {events.map((event) => (
                                    <Card key={event._id} className="p-3">
                                        <h4 className="font-semibold">{event.title}</h4>
                                        <p className="text-sm text-neutral-500">
                                            {new Date(event.datetime).toLocaleString()}
                                        </p>
                                        <Badge className="mt-1">{event.importance}</Badge>
                                    </Card>
                                ))}
                                {events.length === 0 && (
                                    <p className="text-sm text-neutral-500">No upcoming events</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
