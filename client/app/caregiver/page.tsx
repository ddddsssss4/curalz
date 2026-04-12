'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from '@/components/ui/label';
import { authService, caregiverService, eventService, mediaService } from '@/lib/services';

export default function CaregiverDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [activity, setActivity] = useState<any[]>([]);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [memoryInput, setMemoryInput] = useState('');
    const [addingMemory, setAddingMemory] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const [photoForm, setPhotoForm] = useState({ title: '', year: new Date().getFullYear().toString(), category: 'Family', caption: '' });
    const [storyForm, setStoryForm] = useState({ title: '', year: new Date().getFullYear().toString(), description: '', mood: 'Home' });
    const [placeForm, setPlaceForm] = useState({ placeName: '', address: '', category: 'Location', description: '' });

    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [patientEvents, setPatientEvents] = useState<any[]>([]);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);

    // Event creation for patient
    const [eventForm, setEventForm] = useState({
        title: '',
        description: '',
        datetime: '',
        importance: 'medium' as 'low' | 'medium' | 'high',
        reminderOffsets: [15],
    });

    useEffect(() => {
        const currentUser = authService.getCurrentUser();
        if (!currentUser || currentUser.role !== 'caregiver') {
            router.push('/');
            return;
        }
        setUser(currentUser);
        loadPatients();
    }, [router]);

    const loadPatients = async () => {
        try {
            const data = await caregiverService.getPatients();
            setPatients(data.patients || []);
        } catch (error) {
            console.error('Error loading patients:', error);
        }
    };

    const linkPatient = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await caregiverService.linkPatient(email);
            setEmail('');
            loadPatients();
        } catch (error) {
            console.error('Error linking patient:', error);
        } finally {
            setLoading(false);
        }
    };

    const viewActivity = async (patient: any) => {
        setSelectedPatient(patient);
        try {
            const [activityData, eventsData] = await Promise.all([
                caregiverService.getPatientActivity(patient._id),
                caregiverService.getEvents(patient._id)
            ]);
            setActivity(activityData.activity || []);
            setPatientEvents(eventsData.events || []);
        } catch (error) {
            console.error('Error loading patient data:', error);
        }
    };

    const addMemory = async (e: React.FormEvent) => {
        e.preventDefault();
        if ((!memoryInput.trim() && !selectedFile) || !selectedPatient) return;

        setAddingMemory(true);
        try {
            let mediaData;
            if (selectedFile) {
                const { signedUrl, publicUrl, mediaType } = await mediaService.getUploadUrl(selectedFile.name, selectedFile.type);
                await mediaService.uploadToSupabase(signedUrl, selectedFile);
                mediaData = {
                    imageUrl: publicUrl,
                    mediaType,
                    mimeType: selectedFile.type
                };
            }

            await caregiverService.addMemory(selectedPatient._id, memoryInput, mediaData);
            
            setMemoryInput('');
            setSelectedFile(null);
            
            // Refresh activity
            const data = await caregiverService.getPatientActivity(selectedPatient._id);
            setActivity(data.activity || []);
        } catch (error) {
            console.error('Error adding memory:', error);
        } finally {
            setAddingMemory(false);
        }
    };

    const addStructuredMemory = async (e: React.FormEvent, type: 'photo'|'story'|'place') => {
        e.preventDefault();
        if (!selectedPatient) return;
        setAddingMemory(true);
        try {
            if (type === 'photo') {
                let publicUrl = '';
                if (selectedFile) {
                    const { signedUrl, publicUrl: purl } = await mediaService.getUploadUrl(selectedFile.name, selectedFile.type);
                    await mediaService.uploadToSupabase(signedUrl, selectedFile);
                    publicUrl = purl;
                }
                const payload = { ...photoForm, imageUrl: publicUrl };
                await caregiverService.addPhotoMemory(selectedPatient._id, payload);
                setPhotoForm({ title: '', year: new Date().getFullYear().toString(), category: 'Family', caption: '' });
                setSelectedFile(null);
            } else if (type === 'story') {
                await caregiverService.addStoryMemory(selectedPatient._id, storyForm);
                setStoryForm({ title: '', year: new Date().getFullYear().toString(), description: '', mood: 'Home' });
            } else if (type === 'place') {
                let publicUrl = '';
                if (selectedFile) {
                    const { signedUrl, publicUrl: purl } = await mediaService.getUploadUrl(selectedFile.name, selectedFile.type);
                    await mediaService.uploadToSupabase(signedUrl, selectedFile);
                    publicUrl = purl;
                }
                const payload = { ...placeForm, photoUrl: publicUrl };
                await caregiverService.addPlaceMemory(selectedPatient._id, payload);
                setPlaceForm({ placeName: '', address: '', category: 'Location', description: '' });
                setSelectedFile(null);
            }
            
            // Refresh activity
            const data = await caregiverService.getPatientActivity(selectedPatient._id);
            setActivity(data.activity || []);
        } catch (error) {
            console.error('Error adding memory:', error);
        } finally {
            setAddingMemory(false);
        }
    };

    const createPatientEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) return;

        try {
            if (editingEventId) {
                await caregiverService.updateEvent(editingEventId, eventForm);
                alert('Event updated successfully!');
            } else {
                await caregiverService.createEvent(selectedPatient._id, eventForm);
                alert('Event created successfully!');
            }

            // Reset form
            setEventForm({
                title: '',
                description: '',
                datetime: '',
                importance: 'medium',
                reminderOffsets: [15],
            });
            setEditingEventId(null);
            setIsEventModalOpen(false);

            // Refresh events
            const eventsData = await caregiverService.getEvents(selectedPatient._id);
            setPatientEvents(eventsData.events || []);
        } catch (error) {
            console.error('Error saving event:', error);
        }
    };

    const deletePatientEvent = async (eventId: string) => {
        if (!confirm('Are you sure you want to delete this event?')) return;
        try {
            await caregiverService.deleteEvent(eventId);
            // Refresh events
            const eventsData = await caregiverService.getEvents(selectedPatient._id);
            setPatientEvents(eventsData.events || []);
        } catch (error) {
            console.error('Error deleting event:', error);
        }
    };

    const openCreateModal = () => {
        setEditingEventId(null);
        setEventForm({
            title: '',
            description: '',
            datetime: '',
            importance: 'medium',
            reminderOffsets: [15],
        });
        setIsEventModalOpen(true);
    };

    const openEditModal = (event: any) => {
        setEditingEventId(event._id);
        setEventForm({
            title: event.title,
            description: event.description || '',
            datetime: new Date(event.datetime).toISOString().slice(0, 16), // Format for input type="datetime-local"
            importance: event.importance,
            reminderOffsets: event.reminderOffsets || [15],
        });
        setIsEventModalOpen(true);
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
                            <h1 className="text-2xl font-bold">Caregiver Dashboard</h1>
                            <p className="text-sm text-neutral-500">Welcome, {user?.name}</p>
                        </div>
                        <Button variant="outline" onClick={logout}>
                            Logout
                        </Button>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2">
                    {/* Patients List */}
                    <Card className="md:col-span-2">
                        <CardHeader>
                            <CardTitle>My Patients</CardTitle>
                            <CardDescription>Manage your linked patients</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <form onSubmit={linkPatient} className="space-y-2">
                                <Label>Link Patient by Email</Label>
                                <div className="flex gap-2">
                                    <Input
                                        type="email"
                                        placeholder="patient@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                    <Button type="submit" disabled={loading}>
                                        Link
                                    </Button>
                                </div>
                            </form>

                            <div className="grid gap-2 md:grid-cols-2">
                                {patients.map((patient) => (
                                    <Card key={patient._id} className="p-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-semibold">{patient.name}</h4>
                                                <p className="text-sm text-neutral-500">{patient.email}</p>
                                            </div>
                                            <Button size="sm" onClick={() => viewActivity(patient)}>
                                                View
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                                {patients.length === 0 && (
                                    <p className="text-sm text-neutral-500">No linked patients</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Patient Activity */}
                    {selectedPatient && (
                        <Card className="md:col-span-2">
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Patient Activity: {selectedPatient.name}</CardTitle>
                                        <CardDescription>Recent memories and interactions</CardDescription>
                                    </div>
                                    <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" onClick={openCreateModal}>📅 Create Event</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>{editingEventId ? 'Edit Event' : 'Create Event'} for {selectedPatient.name}</DialogTitle>
                                            </DialogHeader>
                                            <form onSubmit={createPatientEvent} className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label>Title</Label>
                                                    <Input
                                                        required
                                                        value={eventForm.title}
                                                        onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                                                        placeholder="Doctor Appointment"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Description</Label>
                                                    <Textarea
                                                        value={eventForm.description}
                                                        onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                                                        placeholder="Dr. Smith checkup"
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
                                                    {editingEventId ? 'Update Event' : 'Create Event'}
                                                </Button>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Add Memory Section */}
                            <Card className="mb-4 bg-white shadow-sm border border-neutral-200">
                                <CardHeader className="pb-2 pt-4 px-4">
                                    <CardTitle className="text-sm font-medium">Add to Timeline</CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pb-4">
                                    <Tabs defaultValue="chat" className="w-full">
                                        <TabsList className="grid w-full grid-cols-4 mb-4">
                                            <TabsTrigger value="chat">Chat</TabsTrigger>
                                            <TabsTrigger value="photo">Photo</TabsTrigger>
                                            <TabsTrigger value="story">Story</TabsTrigger>
                                            <TabsTrigger value="place">Place</TabsTrigger>
                                        </TabsList>
                                        
                                        <TabsContent value="chat">
                                            <form onSubmit={addMemory} className="flex flex-col gap-2">
                                                <div className="flex gap-2 w-full">
                                                    <Input placeholder="Message or memory text..." value={memoryInput} onChange={(e) => setMemoryInput(e.target.value)} />
                                                    <Button type="submit" disabled={addingMemory || !memoryInput.trim()}>Add Chat</Button>
                                                </div>
                                            </form>
                                        </TabsContent>

                                        <TabsContent value="photo">
                                            <form onSubmit={(e) => addStructuredMemory(e, 'photo')} className="flex flex-col gap-3">
                                                <div className="flex gap-2">
                                                    <Input placeholder="Title" required value={photoForm.title} onChange={(e) => setPhotoForm({...photoForm, title: e.target.value})} />
                                                    <Input placeholder="Year" type="number" value={photoForm.year} onChange={(e) => setPhotoForm({...photoForm, year: e.target.value})} />
                                                </div>
                                                <div className="flex gap-2">
                                                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={photoForm.category} onChange={(e) => setPhotoForm({...photoForm, category: e.target.value})}>
                                                        {['Family', 'Travel', 'Achievement', 'Festival', 'Childhood'].map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                    <Input type="file" accept="image/*" required onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                                                </div>
                                                <Textarea placeholder="Caption (optional)" value={photoForm.caption} onChange={(e) => setPhotoForm({...photoForm, caption: e.target.value})} />
                                                <Button type="submit" disabled={addingMemory || !selectedFile}>Add Photo</Button>
                                            </form>
                                        </TabsContent>

                                        <TabsContent value="story">
                                            <form onSubmit={(e) => addStructuredMemory(e, 'story')} className="flex flex-col gap-3">
                                                <div className="flex gap-2">
                                                    <Input placeholder="Story Title" required value={storyForm.title} onChange={(e) => setStoryForm({...storyForm, title: e.target.value})} />
                                                    <Input placeholder="Year" type="number" value={storyForm.year} onChange={(e) => setStoryForm({...storyForm, year: e.target.value})} />
                                                </div>
                                                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={storyForm.mood} onChange={(e) => setStoryForm({...storyForm, mood: e.target.value})}>
                                                    {['Home', 'Love', 'Work', 'Travel', 'Celebrate', 'Nature', 'Learn', 'Achieve'].map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                                <Textarea placeholder="Story description..." required value={storyForm.description} onChange={(e) => setStoryForm({...storyForm, description: e.target.value})} />
                                                <Button type="submit" disabled={addingMemory}>Add Story</Button>
                                            </form>
                                        </TabsContent>

                                        <TabsContent value="place">
                                            <form onSubmit={(e) => addStructuredMemory(e, 'place')} className="flex flex-col gap-3">
                                                <Input placeholder="Place Name" required value={placeForm.placeName} onChange={(e) => setPlaceForm({...placeForm, placeName: e.target.value})} />
                                                <Input placeholder="Address" value={placeForm.address} onChange={(e) => setPlaceForm({...placeForm, address: e.target.value})} />
                                                <div className="flex gap-2">
                                                    <Input placeholder="Category (e.g., Cafe, Park)" value={placeForm.category} onChange={(e) => setPlaceForm({...placeForm, category: e.target.value})} />
                                                    <Input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                                                </div>
                                                <Textarea placeholder="Description..." value={placeForm.description} onChange={(e) => setPlaceForm({...placeForm, description: e.target.value})} />
                                                <Button type="submit" disabled={addingMemory}>Add Place</Button>
                                            </form>
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>

                                <div className="max-h-96 space-y-2 overflow-y-auto">
                                    {activity.map((thought) => (
                                        <Card key={thought._id} className="p-3">
                                            {thought.type === 'photo' && (
                                                <div>
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-semibold">{thought.title} ({thought.year})</h4>
                                                        <Badge>{thought.data?.category}</Badge>
                                                    </div>
                                                    {thought.data?.imageUrl && <img src={thought.data.imageUrl} alt="Memory" className="mt-2 rounded-md max-h-48 object-cover" />}
                                                    <p className="mt-2 text-sm">{thought.data?.caption}</p>
                                                </div>
                                            )}
                                            {thought.type === 'story' && (
                                                <div>
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-semibold">{thought.title} ({thought.year})</h4>
                                                        <Badge variant="outline">{thought.data?.mood}</Badge>
                                                    </div>
                                                    <p className="mt-2 text-sm">{thought.data?.description}</p>
                                                </div>
                                            )}
                                            {thought.type === 'place' && (
                                                <div>
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-semibold">{thought.data?.placeName}</h4>
                                                        <Badge>{thought.data?.category}</Badge>
                                                    </div>
                                                    <p className="text-xs text-neutral-500">{thought.data?.address}</p>
                                                    {thought.data?.photoUrl && <img src={thought.data.photoUrl} alt="Place" className="mt-2 rounded-md max-h-48 object-cover" />}
                                                    <p className="mt-2 text-sm">{thought.data?.description}</p>
                                                </div>
                                            )}
                                            {thought.type === 'chat' && (
                                                <div>
                                                    <p className="text-sm">{thought.data?.rawText}</p>
                                                    {thought.data?.imageUrl && <img src={thought.data.imageUrl} alt="Memory" className="mt-2 rounded-md max-h-48 object-cover" />}
                                                </div>
                                            )}
                                            
                                            <p className="mt-2 text-xs text-neutral-500">
                                                {new Date(thought.timestamp).toLocaleString()}
                                            </p>
                                            {thought.entities && (
                                                <div className="mt-2 flex flex-wrap gap-1">
                                                    {thought.entities.people?.map((person: string) => (
                                                        <Badge key={person} variant="secondary" className="text-xs">
                                                            👤 {person}
                                                        </Badge>
                                                    ))}
                                                    {thought.entities.activities?.map((activity: string) => (
                                                        <Badge key={activity} variant="outline" className="text-xs">
                                                            ⚡ {activity}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </Card>
                                    ))}
                                    {activity.length === 0 && (
                                        <p className="text-sm text-neutral-500">No activity yet</p>
                                    )}
                                </div>

                                {/* Events List */}
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold mb-2">Upcoming Events</h3>
                                    <div className="space-y-2">
                                        {patientEvents.map((event) => (
                                            <Card key={event._id} className="p-3">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h4 className="font-semibold text-sm">{event.title}</h4>
                                                        <p className="text-xs text-neutral-500">
                                                            {new Date(event.datetime).toLocaleString()}
                                                        </p>
                                                        <Badge className="mt-1 text-[10px]" variant={event.importance === 'high' ? 'destructive' : 'secondary'}>
                                                            {event.importance}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEditModal(event)}>
                                                            ✏️
                                                        </Button>
                                                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-600" onClick={() => deletePatientEvent(event._id)}>
                                                            ✕
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                        {patientEvents.length === 0 && (
                                            <p className="text-sm text-neutral-500">No upcoming events</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
