"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { authService, chatService, eventService } from "@/lib/services";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function PatientDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchSummary, setSearchSummary] = useState("");
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [aiImages, setAiImages] = useState<string[]>([]);


  // Event creation
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    datetime: "",
    importance: "medium" as "low" | "medium" | "high",
  });

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser || currentUser.role !== "patient") {
      router.push("/");
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
      setChatHistory(chatData.thoughts || []);
      setEvents(eventsData || []);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    setAiResponse("");
    setAiImages([]);
    try {
      await chatService.sendMessageStream(
        message,
        (chunk) => setAiResponse((prev) => prev + chunk),
        (meta: any) => {
          if (meta.thought) setChatHistory((prev) => [meta.thought, ...prev]);
          if (meta.imageUrls) setAiImages(meta.imageUrls);
        },
      );
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setLoading(false);
    }
  };

  const searchMemories = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const results = await chatService.search(searchQuery);
      setSearchSummary(results.summary || "");
      setSearchResults(results.results || []);
    } catch (error) {
      console.error("Error searching:", error);
    }
  };

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await eventService.create(eventForm);
      setEventForm({
        title: "",
        description: "",
        datetime: "",
        importance: "medium",
      });
      loadData();
    } catch (error) {
      console.error("Error creating event:", error);
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      await eventService.delete(id);
      loadData();
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const logout = () => {
    authService.logout();
    router.push("/");
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
              <CardDescription>
                Share your thoughts and get AI assistance
              </CardDescription>
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
                  {loading ? "Sending..." : "Send Message"}
                </Button>
              </form>

              {aiResponse && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <p className="text-sm font-semibold text-blue-900 mb-2">
                      AI Response:
                    </p>
                    <div className="text-sm text-blue-900 markdown-body prose-sm prose-img:rounded-xl prose-img:mt-2">
                       <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {aiResponse}
                      </ReactMarkdown>
                    </div>
                    {aiImages.length > 0 && (
                      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                        {aiImages.map((url, i) => (
                           // eslint-disable-next-line @next/next/no-img-element
                           <img key={i} src={url} alt="Memory" className="h-32 w-32 object-cover rounded-md shadow-sm border border-blue-100" />
                        ))}
                      </div>
                    )}
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
                    <p className="text-sm font-semibold text-green-900 mb-2">
                      Search Summary:
                    </p>
                    <p className="text-sm text-green-800">{searchSummary}</p>
                  </CardContent>
                </Card>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">Related Memories</h3>
                  {searchResults.map((result: any, index: number) => (
                    <Card
                      key={result.thought?._id || `search-${index}`}
                      className="p-3"
                    >
                      {result.thought?.type === 'photo' && (
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold">{result.thought.title} ({result.thought.year})</h4>
                            <Badge>{result.thought.data?.category}</Badge>
                          </div>
                          {result.thought.data?.imageUrl && <img src={result.thought.data.imageUrl} alt="Memory" className="mt-2 rounded-md max-h-48 object-cover" />}
                          <p className="mt-2 text-sm">{result.thought.data?.caption}</p>
                        </div>
                      )}
                      {result.thought?.type === 'story' && (
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold">{result.thought.title} ({result.thought.year})</h4>
                            <Badge variant="outline">{result.thought.data?.mood}</Badge>
                          </div>
                          <p className="mt-2 text-sm">{result.thought.data?.description}</p>
                        </div>
                      )}
                      {result.thought?.type === 'place' && (
                        <div>
                          <div className="flex justify-between items-start">
                            <h4 className="font-semibold">{result.thought.data?.placeName}</h4>
                            <Badge>{result.thought.data?.category}</Badge>
                          </div>
                          <p className="text-xs text-neutral-500">{result.thought.data?.address}</p>
                          {result.thought.data?.photoUrl && <img src={result.thought.data.photoUrl} alt="Place" className="mt-2 rounded-md max-h-48 object-cover" />}
                          <p className="mt-2 text-sm">{result.thought.data?.description}</p>
                        </div>
                      )}
                      {(!result.thought?.type || result.thought?.type === 'chat') && (
                        <div>
                          <p className="text-sm">{result.thought?.data?.rawText || result.thought?.rawText}</p>
                          {(result.thought?.data?.imageUrl || result.thought?.imageUrl) && (
                            <div className="mt-2">
                               {/* eslint-disable-next-line @next/next/no-img-element */}
                               <img src={result.thought.data?.imageUrl || result.thought.imageUrl} alt="Memory" className="max-h-48 rounded-md object-cover" />
                            </div>
                          )}
                          {result.thought?.data?.entities && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {result.thought.data.entities.people?.map(
                                (person: string, i: number) => (
                                  <Badge key={`sp-${index}-${i}`} variant="secondary">👤 {person}</Badge>
                                ),
                              )}
                              {result.thought.data.entities.activities?.map(
                                (act: string, i: number) => (
                                  <Badge key={`sa-${index}-${i}`} variant="outline">⚡ {act}</Badge>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-neutral-500 mt-1">
                        {new Date(result.thought?.timestamp).toLocaleString()} ·
                        Relevance: {(result.score * 100).toFixed(0)}%
                      </p>
                    </Card>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Recent Memories</h3>
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {chatHistory.map((thought, index) => (
                    <Card
                      key={
                        thought._id || thought.qdrantId || `thought-${index}`
                      }
                      className="p-3"
                    >
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
                      {(!thought.type || thought.type === 'chat') && (
                        <div>
                          <p className="text-sm">{thought.data?.rawText || thought.rawText}</p>
                          {(thought.data?.imageUrl || thought.imageUrl) && (
                            <div className="mt-2">
                               {/* eslint-disable-next-line @next/next/no-img-element */}
                               <img src={thought.data?.imageUrl || thought.imageUrl} alt="Memory" className="max-h-48 rounded-md object-cover" />
                            </div>
                          )}
                          {thought.data?.entities && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {thought.data.entities.people?.map(
                                (person: string, i: number) => (
                                  <Badge key={`person-${index}-${i}`} variant="secondary">👤 {person}</Badge>
                                ),
                              )}
                              {thought.data.entities.activities?.map(
                                (activity: string, i: number) => (
                                  <Badge key={`activity-${index}-${i}`} variant="outline">⚡ {activity}</Badge>
                                ),
                              )}
                            </div>
                          )}
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
                          onChange={(e) =>
                            setEventForm({
                              ...eventForm,
                              title: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={eventForm.description}
                          onChange={(e) =>
                            setEventForm({
                              ...eventForm,
                              description: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Date & Time</Label>
                        <Input
                          type="datetime-local"
                          required
                          value={eventForm.datetime}
                          onChange={(e) =>
                            setEventForm({
                              ...eventForm,
                              datetime: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Importance</Label>
                        <div className="flex gap-2">
                          {(["low", "medium", "high"] as const).map((level) => (
                            <Button
                              key={level}
                              type="button"
                              variant={
                                eventForm.importance === level
                                  ? "default"
                                  : "outline"
                              }
                              onClick={() =>
                                setEventForm({
                                  ...eventForm,
                                  importance: level,
                                })
                              }
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
                          <p className="text-sm text-neutral-600">
                            {event.description}
                          </p>
                        )}
                        <p className="text-sm text-neutral-500 mt-1">
                          {new Date(event.datetime).toLocaleString()}
                        </p>
                        <Badge
                          className="mt-2"
                          variant={
                            event.importance === "high"
                              ? "destructive"
                              : event.importance === "medium"
                                ? "default"
                                : "secondary"
                          }
                        >
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
                  <p className="text-sm text-neutral-500 col-span-2">
                    No upcoming events
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>


      </div>
    </div>
  );
}
