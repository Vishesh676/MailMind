
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Inbox, Send, UserRound, Archive, Star,
  CalendarDays, Settings, Bell, Sparkles, ArrowLeft,
  LoaderCircle, CheckCircle, Search
} from "lucide-react";
import "./App.css";

const initialEmails = [
  {
    id: 1, name: "Rahul Sharma", email: "rahul@techsolutions.com",
    subject: "Project proposal for Q4",
    message: "Hi, I have shared the project proposal. Please review it and let me know your thoughts.",
    time: "10:30 AM", category: "Assistant to Reply",
    unread: true, important: true
  },
  {
    id: 2, name: "Priya Verma", email: "priya@company.com",
    subject: "Meeting confirmation",
    message: "Could you please confirm your availability for tomorrow's meeting?",
    time: "09:45 AM", category: "Client to Reply",
    unread: true, important: false
  },
  {
    id: 3, name: "Amit Kumar", email: "amit@design.com",
    subject: "Design files attached",
    message: "Here are the final design files for your review. Thank you!",
    time: "Yesterday", category: "No Reply Needed",
    unread: false, important: false
  },
  {
    id: 4, name: "Neha Singh", email: "neha@startup.com",
    subject: "Partnership opportunity",
    message: "We would love to discuss a possible partnership with your team.",
    time: "Yesterday", category: "Needs Review",
    unread: true, important: true
  },
  {
    id: 5, name: "Rohan Gupta", email: "rohan@business.com",
    subject: "Invoice approval required",
    message: "Please review the attached invoice and share your approval.",
    time: "Monday", category: "Assistant to Reply",
    unread: false, important: false
  }
];

const categories = [
  "Assistant to Reply",
  "Client to Reply",
  "No Reply Needed",
  "Needs Review"
];

const menuItems = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "All Emails", icon: Inbox },
  { name: "Assistant to Reply", icon: Send },
  { name: "Client to Reply", icon: UserRound },
  { name: "No Reply Needed", icon: Archive },
  { name: "Important", icon: Star },
  { name: "Meetings", icon: CalendarDays },
  { name: "Sent", icon: CheckCircle }
];

function loadFromStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [emails, setEmails] = useState(() =>
    loadFromStorage("mailmind_emails", initialEmails)
  );
  const [sentEmails, setSentEmails] = useState(() =>
    loadFromStorage("mailmind_sent", [])
  );

  const [activeCategory, setActiveCategory] = useState("Overview");
  const [search, setSearch] = useState("");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [userRole, setUserRole] = useState("assistant");

  const [aiResult, setAiResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [draftText, setDraftText] = useState("");
  const [draftApproved, setDraftApproved] = useState(false);
  const [sendStatus, setSendStatus] = useState("");

  useEffect(() => {
    localStorage.setItem("mailmind_emails", JSON.stringify(emails));
  }, [emails]);

  useEffect(() => {
    localStorage.setItem("mailmind_sent", JSON.stringify(sentEmails));
  }, [sentEmails]);

  const clientEmails = emails.filter(
    email => email.category === "Client to Reply"
  );

  const updateCategory = (id, category) => {
    setEmails(previous =>
      previous.map(email =>
        email.id === id ? { ...email, category } : email
      )
    );

    setSelectedEmail(previous =>
      previous && previous.id === id
        ? { ...previous, category }
        : previous
    );
  };

  const toggleImportant = id => {
    setEmails(previous =>
      previous.map(email =>
        email.id === id
          ? { ...email, important: !email.important }
          : email
      )
    );

    setSelectedEmail(previous =>
      previous && previous.id === id
        ? { ...previous, important: !previous.important }
        : previous
    );
  };

  const openEmail = email => {
    const updatedEmail = { ...email, unread: false };
    setSelectedEmail(updatedEmail);

    setEmails(previous =>
      previous.map(item =>
        item.id === email.id ? updatedEmail : item
      )
    );

    setAiResult(null);
    setAiError("");
    setDraftText("");
    setDraftApproved(false);
    setSendStatus("");
  };

  const changeRole = role => {
    setUserRole(role);
    setSelectedEmail(null);
    setAiResult(null);
    setAiError("");
    setDraftText("");
    setDraftApproved(false);
    setSendStatus("");
  };

  const analyzeEmail = async () => {
    if (!selectedEmail || aiLoading) return;

    setAiLoading(true);
    setAiError("");
    setAiResult(null);
    setDraftText("");
    setDraftApproved(false);
    setSendStatus("");

    try {
      const response = await fetch(
        "https://mailmind-backend-fpbk.onrender.com/api/ai/classify",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: selectedEmail.subject,
            message: selectedEmail.message
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI analysis failed.");
      }

      if (!data.category || !data.summary) {
        throw new Error("AI response is incomplete.");
      }

      const result = {
        category: categories.includes(data.category)
          ? data.category
          : "Needs Review",
        summary: data.summary,
        importantDates: Array.isArray(data.importantDates)
          ? data.importantDates
          : [],
        suggestedReply: typeof data.suggestedReply === "string"
          ? data.suggestedReply
          : ""
      };

      setAiResult(result);
      setDraftText(result.suggestedReply);

      // Automatically update the email category using AI result.
      updateCategory(selectedEmail.id, result.category);

    } catch (error) {
      console.error("AI Error:", error);
      setAiError(error.message || "Unable to connect to AI server.");
    } finally {
      setAiLoading(false);
    }
  };

  const sendApprovedDraft = () => {
    if (!selectedEmail || !draftApproved || !draftText.trim()) return;

    const sentRecord = {
      id: Date.now(),
      emailId: selectedEmail.id,
      recipient: selectedEmail.email,
      sender: selectedEmail.name,
      subject: selectedEmail.subject,
      message: draftText,
      sentAt: new Date().toLocaleString(),
      status: "Simulated"
    };

    setSentEmails(previous => [sentRecord, ...previous]);
    updateCategory(selectedEmail.id, "No Reply Needed");
    setSendStatus("sent");
  };

  const filteredEmails = emails.filter(email => {
    let matchesCategory = true;

    if (activeCategory === "Important") {
      matchesCategory = email.important;
    } else if (activeCategory === "Meetings") {
      matchesCategory = /meeting|schedule|appointment/i.test(email.subject);
    } else if (
      activeCategory !== "Overview" &&
      activeCategory !== "All Emails" &&
      activeCategory !== "Sent"
    ) {
      matchesCategory = email.category === activeCategory;
    }

    const searchText = search.toLowerCase();
    const matchesSearch =
      email.name.toLowerCase().includes(searchText) ||
      email.subject.toLowerCase().includes(searchText) ||
      email.message.toLowerCase().includes(searchText);

    return matchesCategory && matchesSearch;
  });

  const filteredSentEmails = sentEmails.filter(email => {
    const searchText = search.toLowerCase();
    return (
      email.recipient.toLowerCase().includes(searchText) ||
      email.subject.toLowerCase().includes(searchText) ||
      email.message.toLowerCase().includes(searchText)
    );
  });

  const selectMenu = name => {
    setActiveCategory(name);
    setSelectedEmail(null);
    setSearch("");
    setAiResult(null);
    setAiError("");
    setSendStatus("");
  };

  if (userRole === "client") {
    const visibleClientEmails = clientEmails.filter(email => {
      const searchText = search.toLowerCase();
      return (
        email.name.toLowerCase().includes(searchText) ||
        email.subject.toLowerCase().includes(searchText) ||
        email.message.toLowerCase().includes(searchText)
      );
    });

    return (
      <div className="app">
        <aside className="sidebar">
          <div className="logo">
            <Sparkles size={25} />
            <span>MailMind</span>
          </div>

          <div className="role-switch">
            <button className="role-button" onClick={() => changeRole("assistant")}>
              Assistant
            </button>
            <button className="role-button active">Client</button>
          </div>

          <div className="sidebar-label">WORKSPACE</div>

          <button className="menu-item active" onClick={() => setSelectedEmail(null)}>
            <Inbox size={18} />
            <span>Emails to Reply</span>
          </button>

          <div className="sidebar-bottom">
            <button className="menu-item">
              <Settings size={18} />
              <span>Settings</span>
            </button>
          </div>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <div>
              <h2>Client Workspace</h2>
              <p>Manage emails that need your response.</p>
            </div>
            <div className="topbar-actions">
              <span className="role-label">Client</span>
              <Bell size={20} />
              <div className="avatar">C</div>
            </div>
          </header>

          <section className="dashboard-content">
            {selectedEmail ? (
              <div className="email-detail">
                <button className="back-button" onClick={() => setSelectedEmail(null)}>
                  <ArrowLeft size={18} /> Back to emails
                </button>

                <div className="detail-card">
                  <div className="detail-header">
                    <div>
                      <span className="category-badge client-badge">
                        Client to Reply
                      </span>
                      <h2>{selectedEmail.subject}</h2>
                      <p>From {selectedEmail.name} · {selectedEmail.email}</p>
                    </div>
                    <button className="star-button" onClick={() => toggleImportant(selectedEmail.id)}>
                      <Star size={20} fill={selectedEmail.important ? "currentColor" : "none"} />
                    </button>
                  </div>

                  <div className="email-message">{selectedEmail.message}</div>

                  <div className="client-actions">
                    <button
                      className="primary-button"
                      onClick={() => {
                        updateCategory(selectedEmail.id, "No Reply Needed");
                        setSelectedEmail(null);
                      }}
                    >
                      <CheckCircle size={17} /> Mark Handled
                    </button>

                    <button
                      className="secondary-button"
                      onClick={() => {
                        updateCategory(selectedEmail.id, "Assistant to Reply");
                        setSelectedEmail(null);
                      }}
                    >
                      Ask Assistant to Take Over
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="welcome-section">
                  <h1>Emails to Reply</h1>
                  <p>These emails are waiting for your response.</p>
                </div>

                <div className="search-box">
                  <Search size={18} />
                  <input
                    placeholder="Search emails..."
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                  />
                </div>

                <div className="email-list">
                  {visibleClientEmails.length === 0 ? (
                    <div className="empty-state">
                      <Inbox size={35} />
                      <h3>No emails to reply</h3>
                      <p>You're all caught up!</p>
                    </div>
                  ) : visibleClientEmails.map(email => (
                    <button className="email-row" key={email.id} onClick={() => openEmail(email)}>
                      <div className="email-avatar">{email.name.charAt(0)}</div>
                      <div className="email-row-content">
                        <div className="email-row-top">
                          <strong>{email.name}</strong>
                          <span>{email.time}</span>
                        </div>
                        <h3>{email.subject}</h3>
                        <p>{email.message}</p>
                      </div>
                      {email.unread && <span className="unread-dot" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <Sparkles size={25} />
          <span>MailMind</span>
        </div>

        <div className="role-switch">
          <button className="role-button active">Assistant</button>
          <button className="role-button" onClick={() => changeRole("client")}>
            Client
          </button>
        </div>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="sidebar-menu">
          {menuItems.map(item => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                className={activeCategory === item.name ? "menu-item active" : "menu-item"}
                onClick={() => selectMenu(item.name)}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button className="menu-item">
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h2>Assistant Dashboard</h2>
            <p>Manage your inbox with AI assistance.</p>
          </div>
          <div className="topbar-actions">
            <span className="role-label">Assistant</span>
            <Bell size={20} />
            <div className="avatar">A</div>
          </div>
        </header>

        <section className="dashboard-content">
          {selectedEmail ? (
            <div className="email-detail">
              <button className="back-button" onClick={() => setSelectedEmail(null)}>
                <ArrowLeft size={18} /> Back to emails
              </button>

              <div className="detail-card">
                <div className="detail-header">
                  <div>
                    <span className="category-badge">{selectedEmail.category}</span>
                    <h2>{selectedEmail.subject}</h2>
                    <p>From {selectedEmail.name} · {selectedEmail.email}</p>
                  </div>
                  <button className="star-button" onClick={() => toggleImportant(selectedEmail.id)}>
                    <Star size={20} fill={selectedEmail.important ? "currentColor" : "none"} />
                  </button>
                </div>

                <div className="email-message">{selectedEmail.message}</div>

                <div className="classification-actions">
                  <p>Manually classify this email:</p>
                  {categories.map(category => (
                    <button
                      key={category}
                      className={selectedEmail.category === category ? "primary-button" : "secondary-button"}
                      onClick={() => updateCategory(selectedEmail.id, category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>

                <div className="ai-panel">
                  <div className="ai-panel-heading">
                    <div>
                      <Sparkles size={20} />
                      <h3>AI Email Assistant</h3>
                    </div>

                    <button className="primary-button" onClick={analyzeEmail} disabled={aiLoading}>
                      {aiLoading ? (
                        <>
                          <LoaderCircle size={17} /> Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles size={17} /> Analyze Email
                        </>
                      )}
                    </button>
                  </div>

                  {aiError && <p className="error-message">{aiError}</p>}

                  {aiResult && (
                    <div className="ai-result">
                      <div className="ai-result-item">
                        <strong>AI Classification</strong>
                        <p>{aiResult.category}</p>
                        <p className="success-message">Category automatically updated.</p>
                      </div>

                      <div className="ai-result-item">
                        <strong>Email Summary</strong>
                        <p>{aiResult.summary}</p>
                      </div>

                      <div className="ai-result-item">
                        <strong>Important Dates & Actions</strong>
                        {aiResult.importantDates.length > 0 ? (
                          <ul>
                            {aiResult.importantDates.map((date, index) => (
                              <li key={index}>{date}</li>
                            ))}
                          </ul>
                        ) : (
                          <p>No important dates identified.</p>
                        )}
                      </div>

                      <div className="ai-result-item">
                        <strong>Suggested Reply</strong>
                        <textarea
                          value={draftText}
                          onChange={event => {
                            setDraftText(event.target.value);
                            setDraftApproved(false);
                            setSendStatus("");
                          }}
                          placeholder="Edit your AI suggested reply..."
                          rows={5}
                        />

                        <button
                          className="primary-button"
                          disabled={!draftText.trim()}
                          onClick={() => {
                            setDraftApproved(true);
                            setSendStatus("");
                          }}
                        >
                          <CheckCircle size={17} /> Approve Draft
                        </button>

                        {draftApproved && sendStatus !== "sent" && (
                          <div className="send-confirmation">
                            <p className="success-message">Draft approved. Review it before sending.</p>
                            <button className="primary-button" onClick={sendApprovedDraft}>
                              <Send size={17} /> Send Email
                            </button>
                          </div>
                        )}

                        {sendStatus === "sent" && (
                          <div className="sent-success">
                            <CheckCircle size={20} />
                            <div>
                              <strong>Email sent successfully!</strong>
                              <p>Simulated sending completed. No real email was sent.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!aiResult && !aiLoading && !aiError && (
                    <p>Click Analyze Email to get an AI summary, classification and suggested reply.</p>
                  )}
                </div>
              </div>
            </div>
          ) : activeCategory === "Sent" ? (
            <>
              <div className="welcome-section">
                <h1>Sent Emails</h1>
                <p>View your approved and simulated sent replies.</p>
              </div>

              <div className="search-box">
                <Search size={18} />
                <input
                  placeholder="Search sent emails..."
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                />
              </div>

              <div className="email-list">
                {filteredSentEmails.length === 0 ? (
                  <div className="empty-state">
                    <Send size={35} />
                    <h3>No sent emails yet</h3>
                    <p>Approved and sent replies will appear here.</p>
                  </div>
                ) : filteredSentEmails.map(email => (
                  <div className="email-row" key={email.id}>
                    <div className="email-avatar">{email.recipient.charAt(0).toUpperCase()}</div>
                    <div className="email-row-content">
                      <div className="email-row-top">
                        <strong>To: {email.recipient}</strong>
                        <span>{email.sentAt}</span>
                      </div>
                      <h3>{email.subject}</h3>
                      <p>{email.message}</p>
                      <span className="category-badge">Simulated Send</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="welcome-section">
                <h1>Good morning 👋</h1>
                <p>Here's what's happening in your inbox today.</p>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <span>Total Emails</span>
                  <h2>{emails.length}</h2>
                  <Inbox size={22} />
                </div>
                <div className="stat-card">
                  <span>Assistant to Reply</span>
                  <h2>{emails.filter(email => email.category === "Assistant to Reply").length}</h2>
                  <Send size={22} />
                </div>
                <div className="stat-card">
                  <span>Client to Reply</span>
                  <h2>{clientEmails.length}</h2>
                  <UserRound size={22} />
                </div>
                <div className="stat-card">
                  <span>Needs Review</span>
                  <h2>{emails.filter(email => email.category === "Needs Review").length}</h2>
                  <Sparkles size={22} />
                </div>
              </div>

              <div className="inbox-heading">
                <div>
                  <h2>{activeCategory === "Overview" ? "Recent Emails" : activeCategory}</h2>
                  <p>Review and manage your emails.</p>
                </div>
              </div>

              <div className="search-box">
                <Search size={18} />
                <input
                  placeholder="Search by sender, subject or message..."
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                />
              </div>

              <div className="email-list">
                {filteredEmails.length === 0 ? (
                  <div className="empty-state">
                    <Inbox size={35} />
                    <h3>No emails found</h3>
                    <p>Try changing your search or filter.</p>
                  </div>
                ) : filteredEmails.map(email => (
                  <div className="email-row" key={email.id}>
                    <button className="email-row-main" onClick={() => openEmail(email)}>
                      <div className="email-avatar">{email.name.charAt(0)}</div>
                      <div className="email-row-content">
                        <div className="email-row-top">
                          <strong>{email.name}</strong>
                          <span>{email.time}</span>
                        </div>
                        <h3>{email.subject}</h3>
                        <p>{email.message}</p>
                        <span className="category-badge">{email.category}</span>
                      </div>
                    </button>

                    <button className="star-button" onClick={() => toggleImportant(email.id)} aria-label="Toggle important">
                      <Star size={18} fill={email.important ? "currentColor" : "none"} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
