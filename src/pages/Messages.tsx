import { useState } from 'react';
import { Send } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import PageHeader from '@/components/layout/PageHeader';
import Card from '@/components/widgets/Card';
import Button from '@/components/widgets/Button';
import { formatDate } from '@/lib/format';

export default function Messages() {
  const { messages, users, currentUser, sendMessage } = useApp();
  const me = currentUser!;
  const contacts = users.filter((u) => u.id !== me.id);
  const [activeId, setActiveId] = useState(contacts[0]?.id ?? 0);
  const [text, setText] = useState('');

  const thread = messages.
  filter(
    (m) =>
    m.fromId === me.id && m.toId === activeId ||
    m.fromId === activeId && m.toId === me.id
  ).
  sort((a, b) => a.id - b.id);

  const activeUser = users.find((u) => u.id === activeId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage({ fromId: me.id, toId: activeId, subject: 'Message', body: text.trim() });
    setText('');
  };

  const unreadFrom = (uid: number) =>
  messages.filter((m) => m.fromId === uid && m.toId === me.id && !m.read).length;

  return (
    <div data-ev-id="ev_f3e1e90df6">
			<PageHeader title="Messages" subtitle="Direct communication with your network" />
			<div data-ev-id="ev_3d4f1afa09" className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<Card title="Contacts">
					<div data-ev-id="ev_11477d4b37" className="flex flex-col gap-1">
						{contacts.map((c) => {
              const unread = unreadFrom(c.id);
              return (
                <button data-ev-id="ev_8b21ce9be9"
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                activeId === c.id ? 'bg-primary/5' : 'hover:bg-canvas'}`
                }>

									<div data-ev-id="ev_30df893b8c" className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
										{c.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
									</div>
									<div data-ev-id="ev_b5535a68a4" className="min-w-0 flex-1">
										<p data-ev-id="ev_3d6c3f3752" className="truncate text-sm font-medium text-gray-800">{c.name}</p>
										<p data-ev-id="ev_ce593c1fd3" className="truncate text-xs capitalize text-muted-foreground">{c.role}</p>
									</div>
									{unread > 0 && <span data-ev-id="ev_c6b1841692" className="rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">{unread}</span>}
								</button>);

            })}
					</div>
				</Card>

				<div data-ev-id="ev_616cee7706" className="lg:col-span-2">
					<Card title={activeUser?.name ?? 'Conversation'} subtitle={activeUser?.role}>
						<div data-ev-id="ev_356ab6e552" className="flex h-80 flex-col gap-3 overflow-y-auto pr-1">
							{thread.length === 0 && <p data-ev-id="ev_2ef0e13772" className="m-auto text-sm text-muted-foreground">No messages yet. Say hello!</p>}
							{thread.map((m) => {
                const mine = m.fromId === me.id;
                return (
                  <div data-ev-id="ev_3a5043a31d" key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
										<div data-ev-id="ev_f9bd954b0f" className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? 'bg-primary text-white' : 'bg-canvas text-gray-800'}`}>
											<p data-ev-id="ev_f431a8a663">{m.body}</p>
											<p data-ev-id="ev_c75de077a4" className={`mt-1 text-[10px] ${mine ? 'text-white/60' : 'text-muted-foreground'}`}>{formatDate(m.date)}</p>
										</div>
									</div>);

              })}
						</div>
						<form data-ev-id="ev_45b16d35f6" onSubmit={submit} className="mt-4 flex gap-2">
							<input data-ev-id="ev_4e7b091c7a"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />

							<Button type="submit"><Send className="h-4 w-4" /> Send</Button>
						</form>
					</Card>
				</div>
			</div>
		</div>);

}