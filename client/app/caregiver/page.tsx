'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { authService, caregiverService, eventService } from '@/lib/services';

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
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);

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
            const data = await caregiverService.getPatientActivity(patient._id);
            setActivity(data.activity || []);
        } catch (error) {
            console.error('Error loading activity:', error);
        }
    };

    const addMemory = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!memoryInput.trim() || !selectedPatient) return;

        setAddingMemory(true);
        try {
            await caregiverService.addMemory(selectedPatient._id, memoryInput);
            setMemoryInput('');
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
            await caregiverService.createEvent(selectedPatient._id, eventForm);
            setEventForm({
                title: '',
                description: '',
                datetime: '',
                importance: 'medium',
                reminderOffsets: [15],
            });
            setIsEventModalOpen(false);
            // Could refresh activity if events were shown there, or show success toast
            alert('Event created successfully!');
        } catch (error) {
            console.error('Error creating event:', error);
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
                                            <Button variant="outline">📅 Create Event</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Create Event for {selectedPatient.name}</DialogTitle>
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
                                                    Create Event
                                                </Button>
                                            </form>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {/* Add Memory Section */}
                                <Card className="mb-4 bg-blue-50/50 border-blue-100">
                                    <CardContent className="p-3">
                                        <form onSubmit={addMemory} className="flex gap-2">
                                            <Input
                                                placeholder={`Add a memory for ${selectedPatient.name}... (e.g., "Mom enjoyed her lunch")`}
                                                value={memoryInput}
                                                onChange={(e) => setMemoryInput(e.target.value)}
                                            />
                                            <Button type="submit" disabled={addingMemory}>
                                                {addingMemory ? 'Adding...' : 'Add Memory'}
                                            </Button>
                                        </form>
                                    </CardContent>
                                </Card>

                                <div className="max-h-96 space-y-2 overflow-y-auto">
                                    {activity.map((thought) => (
                                        <Card key={thought._id} className="p-3">
                                            <p className="text-sm">{thought.rawText}</p>
                                            <p className="mt-1 text-xs text-neutral-500">
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
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
