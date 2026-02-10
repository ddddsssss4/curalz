'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { authService, caregiverService } from '@/lib/services';

export default function CaregiverDashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [patients, setPatients] = useState<any[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [activity, setActivity] = useState<any[]>([]);
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

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
                    <Card>
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

                            <div className="space-y-2">
                                {patients.map((patient) => (
                                    <Card key={patient._id} className="p-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-semibold">{patient.name}</h4>
                                                <p className="text-sm text-neutral-500">{patient.email}</p>
                                            </div>
                                            <Button size="sm" onClick={() => viewActivity(patient)}>
                                                View Activity
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
                    <Card>
                        <CardHeader>
                            <CardTitle>Patient Activity</CardTitle>
                            <CardDescription>
                                {selectedPatient ? `${selectedPatient.name}'s memories` : 'Select a patient'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
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
                                                        {person}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </Card>
                                ))}
                                {!selectedPatient && (
                                    <p className="text-sm text-neutral-500">Select a patient to view their activity</p>
                                )}
                                {selectedPatient && activity.length === 0 && (
                                    <p className="text-sm text-neutral-500">No activity yet</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
