import { useEffect, useState, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { getProfilePhotoUrl } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageCircle, Send, User, ArrowLeft, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface MatchProfile {
  user_id: string;
  name: string;
  photo_url: string | null;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read: boolean;
}

const Chat = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const selectedUserId = searchParams.get("with");

  const selectedMatch = useMemo(
    () => matches.find((m) => m.user_id === selectedUserId) || null,
    [matches, selectedUserId]
  );

  // Fetch matched users
  useEffect(() => {
    if (!user) return;
    const fetchMatches = async () => {
      const { data: interests } = await supabase
        .from("interests")
        .select("from_user_id, to_user_id")
        .eq("status", "accepted")
        .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);

      if (!interests || interests.length === 0) {
        setMatches([]);
        setLoading(false);
        return;
      }

      const matchedIds = interests.map((i) =>
        i.from_user_id === user.id ? i.to_user_id : i.from_user_id
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, photo_url")
        .in("user_id", matchedIds);

      setMatches((profiles as MatchProfile[]) || []);
      setLoading(false);
    };
    fetchMatches();
  }, [user]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!user || !selectedUserId) {
      setMessages([]);
      return;
    }

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${selectedUserId}),and(sender_id.eq.${selectedUserId},receiver_id.eq.${user.id})`
        )
        .order("created_at", { ascending: true });

      setMessages((data as Message[]) || []);

      // Mark unread messages as read
      await supabase
        .from("messages")
        .update({ read: true })
        .eq("sender_id", selectedUserId)
        .eq("receiver_id", user.id)
        .eq("read", false);
    };

    fetchMessages();
  }, [user, selectedUserId]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as Message;
          const isRelevant =
            (msg.sender_id === user.id && msg.receiver_id === selectedUserId) ||
            (msg.sender_id === selectedUserId && msg.receiver_id === user.id);

          if (isRelevant) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
            // Mark as read if we're the receiver
            if (msg.receiver_id === user.id) {
              supabase
                .from("messages")
                .update({ read: true })
                .eq("id", msg.id);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedUserId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !selectedUserId) return;
    setSending(true);

    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: selectedUserId,
      content: newMessage.trim(),
    });

    if (error) {
      toast.error("Failed to send message");
    } else {
      setNewMessage("");
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredMatches = matches.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectConversation = (userId: string) => {
    setSearchParams({ with: userId });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <div className="flex-1 flex overflow-hidden" style={{ height: "calc(100vh - 4rem)" }}>
        {/* Sidebar - conversation list */}
        <div
          className={`border-r bg-card flex flex-col w-full sm:w-80 sm:flex-shrink-0 ${
            selectedUserId ? "hidden sm:flex" : "flex"
          }`}
        >
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold mb-3" style={{ fontFamily: "var(--font-display)" }}>
              Messages
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-8 text-center">
                <MessageCircle className="mx-auto h-6 w-6 animate-pulse text-primary" />
              </div>
            ) : filteredMatches.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <MessageCircle className="mx-auto mb-2 h-8 w-8 text-primary/30" />
                <p>No matched users to chat with</p>
              </div>
            ) : (
              filteredMatches.map((m) => {
                const photoUrl = getProfilePhotoUrl(m.photo_url);
                return (
                  <button
                    key={m.user_id}
                    onClick={() => selectConversation(m.user_id)}
                    className={`w-full flex items-center gap-3 p-4 hover:bg-accent/50 transition-colors text-left border-b ${
                      selectedUserId === m.user_id ? "bg-accent" : ""
                    }`}
                  >
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                      {photoUrl ? (
                        <img src={photoUrl} alt={m.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <User className="h-5 w-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>
                    <span className="font-medium truncate">{m.name}</span>
                  </button>
                );
              })
            )}
          </ScrollArea>
        </div>

        {/* Chat area */}
        <div
          className={`flex-1 flex flex-col ${
            selectedUserId ? "flex" : "hidden sm:flex"
          }`}
        >
          {selectedMatch ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 border-b p-4 bg-card">
                <Button
                  variant="ghost"
                  size="sm"
                  className="sm:hidden"
                  onClick={() => setSearchParams({})}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-full bg-muted">
                  {getProfilePhotoUrl(selectedMatch.photo_url) ? (
                    <img
                      src={getProfilePhotoUrl(selectedMatch.photo_url)!}
                      alt={selectedMatch.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <span className="font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                  {selectedMatch.name}
                </span>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3 max-w-2xl mx-auto">
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground text-sm py-12">
                      <MessageCircle className="mx-auto mb-2 h-8 w-8 text-primary/20" />
                      <p>Say hello to {selectedMatch.name}!</p>
                    </div>
                  )}
                  {messages.map((msg) => {
                    const isMine = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                            isMine
                              ? "bg-primary text-primary-foreground rounded-br-md"
                              : "bg-muted text-foreground rounded-bl-md"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                          <p
                            className={`text-[10px] mt-1 ${
                              isMine ? "text-primary-foreground/60" : "text-muted-foreground"
                            }`}
                          >
                            {format(new Date(msg.created_at), "h:mm a")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="border-t p-4 bg-card">
                <div className="flex gap-2 max-w-2xl mx-auto">
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={sending}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!newMessage.trim() || sending}
                    className="gap-2 gradient-warm border-0"
                  >
                    <Send className="h-4 w-4" />
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <MessageCircle className="mx-auto mb-3 h-12 w-12 text-primary/20" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose a match to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Chat;
