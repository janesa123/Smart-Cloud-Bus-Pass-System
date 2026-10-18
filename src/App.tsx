import { FormEvent, ReactNode, useEffect, useState } from "react"

type View = "home" | "login" | "register" | "dashboard" | "book" | "history" | "pass" | "profile" | "admin-login" | "admin" | "admin-users" | "admin-passes"

type User = {
  id: number
  name: string
  email: string
  phone: string
  address: string
  password: string
  joined: string
}

type BusPass = {
  id: number
  passId: string
  userId: number
  passenger: string
  source: string
  destination: string
  type: "Daily" | "Weekly" | "Monthly"
  issueDate: string
  expiryDate: string
  status: "Active" | "Expired" | "Cancelled"
  createdAt: string
}

type Toast = {
  message: string
  type: "success" | "error" | "info"
}

type PassViewProps = {
  pass?: BusPass
  go: (view: View) => void
}

type DataProps = {
  label: string
  value: string
}

const today = () => new Date().toISOString().slice(0, 10)

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T12:00:00`))
}

function statusFor(pass: BusPass): BusPass["status"] {
  if (pass.status === "Cancelled") return "Cancelled"
  return pass.expiryDate < today() ? "Expired" : "Active"
}

const seedUsers: User[] = [
  {
    id: 1,
    name: "Maya Thompson",
    email: "maya@example.com",
    phone: "+1 555 014 820",
    address: "42 Riverside Avenue, Central District",
    password: "Pass1234",
    joined: "2025-01-12",
  },
  {
    id: 2,
    name: "Noah Williams",
    email: "noah@example.com",
    phone: "+1 555 018 411",
    address: "18 North Street, University Quarter",
    password: "Pass1234",
    joined: "2025-02-04",
  },
  {
    id: 3,
    name: "Sofia Chen",
    email: "sofia@example.com",
    phone: "+1 555 010 622",
    address: "7 Market Lane, West End",
    password: "Pass1234",
    joined: "2025-02-22",
  },
]

const seedPasses: BusPass[] = [
  {
    id: 1,
    passId: "SCBP-250314-A7K2",
    userId: 1,
    passenger: "Maya Thompson",
    source: "Central Station",
    destination: "University Gate",
    type: "Monthly",
    issueDate: today(),
    expiryDate: addDays(today(), 29),
    status: "Active",
    createdAt: today(),
  },
  {
    id: 2,
    passId: "SCBP-250208-P9M4",
    userId: 1,
    passenger: "Maya Thompson",
    source: "Riverside Park",
    destination: "Tech Square",
    type: "Weekly",
    issueDate: addDays(today(), -40),
    expiryDate: addDays(today(), -34),
    status: "Expired",
    createdAt: addDays(today(), -40),
  },
  {
    id: 3,
    passId: "SCBP-250316-N3J8",
    userId: 2,
    passenger: "Noah Williams",
    source: "North Terminal",
    destination: "Civic Centre",
    type: "Weekly",
    issueDate: today(),
    expiryDate: addDays(today(), 6),
    status: "Active",
    createdAt: today(),
  },
]

function loadStored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

function Icon({
  name,
  size = 20,
}: {
  name: "bus" | "arrow" | "ticket" | "clock" | "user" | "plus" | "route" | "shield" | "menu" | "close" | "logout" | "users" | "search" | "check" | "edit" | "chevron"
  size?: number
}) {
  const paths: Record<string, ReactNode> = {
    bus: (
      <>
        <path d="M6 17h12M7 17v2m10-2v2M5 14V6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5V14a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3Z" />
        <path d="M5 10h14M8 7h3m2 0h3M8 14h.01M16 14h.01" />
      </>
    ),
    arrow: <path d="M5 12h14m-5-5 5 5-5 5" />,
    ticket: (
      <path d="M4 7a2 2 0 0 0 2-2h12v4a3 3 0 0 0 0 6v4H6a2 2 0 0 0-2-2V7Zm6-2v14" />
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    route: (
      <>
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="6" r="2" />
        <path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3h1" />
      </>
    ),
    shield: (
      <path d="M12 3 5 6v5c0 4.6 2.9 8.1 7 10 4.1-1.9 7-5.4 7-10V6l-7-3Zm-3 9 2 2 4-4" />
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    logout: <path d="M10 5H5v14h5m4-3 4-4-4-4m-8 4h12" />,
    users: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19a6 6 0 0 1 12 0m1-14a3 3 0 0 1 0 6m2 2a5 5 0 0 1 3 5" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    edit: <path d="m4 20 4.5-1L19 8.5 15.5 5 5 15.5 4 20ZM13.5 7l3.5 3.5" />,
    chevron: <path d="m9 6 6 6-6 6" />,
  }
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      {paths[name]}
    </svg>
  )
}

function QRPattern({ value }: { value: string }) {
  const bits = Array.from({ length: 121 }, (_, index) => {
    const code = value.charCodeAt(index % value.length)
    return (code * (index + 7) + index * 13) % 5 < 2
  })
  return (
    <div className="qr-code" aria-label={`Digital code for ${value}`}>
      {bits.map((active, index) => (
        <i className={active ? "on" : ""} key={index} />
      ))}
      <span className="qr-corner one" />
      <span className="qr-corner two" />
      <span className="qr-corner three" />
    </div>
  )
}

function Status({ value }: { value: BusPass["status"] }) {
  return <span className={`status status-${value.toLowerCase()}`}>{value}</span>
}

function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  )
}

export default function App() {
  const [view, setView] = useState<View>("home")
  const [users, setUsers] = useState<User[]>(() =>
    loadStored("smartbus-users", seedUsers),
  )
  const [passes, setPasses] = useState<BusPass[]>(() =>
    loadStored("smartbus-passes", seedPasses),
  )
  const [userId, setUserId] = useState<number | null>(() =>
    loadStored<number | null>("smartbus-session", null),
  )
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedPassId, setSelectedPassId] = useState<number | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(
    () => localStorage.setItem("smartbus-users", JSON.stringify(users)),
    [users],
  )
  useEffect(
    () => localStorage.setItem("smartbus-passes", JSON.stringify(passes)),
    [passes],
  )
  useEffect(
    () => localStorage.setItem("smartbus-session", JSON.stringify(userId)),
    [userId],
  )
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(timer)
  }, [toast])

  const user = users.find((item) => item.id === userId) ?? null
  const userPasses = passes
    .filter((item) => item.userId === userId)
    .map((item) => ({ ...item, status: statusFor(item) }))

  const go = (next: View) => {
    setView(next)
    setMobileOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const notify = (message: string, type: Toast["type"] = "success") =>
    setToast({ message, type })

  const openPass = (id: number) => {
    setSelectedPassId(id)
    go("pass")
  }

  const logout = () => {
    setUserId(null)
    setIsAdmin(false)
    go("home")
    notify("You have been signed out.", "info")
  }

  const navItems = isAdmin
    ? [
        ["Overview", "admin"],
        ["Users", "admin-users"],
        ["Passes", "admin-passes"],
      ]
    : user
      ? [
          ["Dashboard", "dashboard"],
          ["My passes", "history"],
          ["Profile", "profile"],
        ]
      : [
          ["Home", "home"],
          ["Login", "login"],
        ]

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="container nav-wrap">
          <button
            className="brand"
            onClick={() => go(isAdmin ? "admin" : user ? "dashboard" : "home")}
          >
            <span className="brand-symbol">
              <Icon name="bus" size={22} />
            </span>
            <span>
              SmartBus <b>Cloud</b>
            </span>
          </button>
          <nav className={mobileOpen ? "nav-links open" : "nav-links"}>
            {navItems.map(([label, destination]) => (
              <button
                className={view === destination ? "active" : ""}
                key={destination}
                onClick={() => go(destination as View)}
              >
                {label}
              </button>
            ))}
            {!user && !isAdmin && (
              <button className="nav-cta" onClick={() => go("register")}>
                Create account
              </button>
            )}
            {(user || isAdmin) && (
              <button className="nav-logout" onClick={logout}>
                <Icon name="logout" size={17} /> Log out
              </button>
            )}
          </nav>
          <button
            aria-label="Toggle menu"
            className="menu-button"
            onClick={() => setMobileOpen((current) => !current)}
          >
            <Icon name={mobileOpen ? "close" : "menu"} />
          </button>
        </div>
      </header>

      {toast && (
        <div className={`toast toast-${toast.type}`} role="status">
          <span>
            <Icon
              name={toast.type === "success" ? "check" : "shield"}
              size={18}
            />
          </span>
          {toast.message}
        </div>
      )}

      <main>
        {view === "home" && <Home go={go} />}
        {view === "register" && (
          <Register
            go={go}
            users={users}
            onRegister={(newUser) => {
              setUsers((current) => [...current, newUser])
              setUserId(newUser.id)
              go("dashboard")
              notify("Your account is ready. Welcome aboard!")
            }}
            notify={notify}
          />
        )}
        {view === "login" && (
          <Login
            go={go}
            users={users}
            onLogin={(id) => {
              setUserId(id)
              go("dashboard")
              notify("Welcome back.")
            }}
            notify={notify}
          />
        )}
        {view === "dashboard" && user && (
          <Dashboard
            user={user}
            passes={userPasses}
            go={go}
            openPass={openPass}
          />
        )}
        {view === "book" && user && (
          <BookPass
            user={user}
            onBook={(newPass) => {
              setPasses((current) => [newPass, ...current])
              setSelectedPassId(newPass.id)
              go("pass")
              notify("Your new digital pass is ready.")
            }}
          />
        )}
        {view === "history" && user && (
          <History passes={userPasses} go={go} openPass={openPass} />
        )}
        {view === "pass" && user && (
          <PassView
            pass={
              userPasses.find((item) => item.id === selectedPassId) ??
              userPasses[0]
            }
            go={go}
          />
        )}
        {view === "profile" && user && (
          <Profile
            user={user}
            onUpdate={(changes) => {
              setUsers((current) =>
                current.map((item) =>
                  item.id === user.id ? { ...item, ...changes } : item,
                ),
              )
              notify("Profile updated successfully.")
            }}
            notify={notify}
          />
        )}
        {view === "admin-login" && (
          <AdminLogin
            go={go}
            notify={notify}
            onLogin={() => {
              setUserId(null)
              setIsAdmin(true)
              go("admin")
              notify("Administrator access granted.")
            }}
          />
        )}
        {view === "admin" && isAdmin && (
          <AdminDashboard users={users} passes={passes} go={go} />
        )}
        {view === "admin-users" && isAdmin && (
          <AdminUsers
            users={users}
            passes={passes}
            selectedUserId={selectedUserId}
            setSelectedUserId={setSelectedUserId}
            onDelete={(id) => {
              setUsers((current) => current.filter((item) => item.id !== id))
              setPasses((current) =>
                current.filter((item) => item.userId !== id),
              )
              setSelectedUserId(null)
              notify("User and associated passes deleted.")
            }}
          />
        )}
        {view === "admin-passes" && isAdmin && (
          <AdminPasses
            passes={passes}
            users={users}
            onStatus={(id, status) => {
              setPasses((current) =>
                current.map((item) =>
                  item.id === id ? { ...item, status } : item,
                ),
              )
              notify(
                `Pass ${status === "Cancelled" ? "cancelled" : "reactivated"}.`,
              )
            }}
          />
        )}
        {((view.startsWith("admin") && view !== "admin-login" && !isAdmin) ||
          (["dashboard", "book", "history", "pass", "profile"].includes(view) &&
            !user)) && (
          <AccessRequired admin={view.startsWith("admin")} go={go} />
        )}
      </main>

      <footer>
        <div className="container footer-wrap">
          <div>
            <span className="brand-symbol small">
              <Icon name="bus" size={17} />
            </span>
            <b>SmartBus Cloud</b>
          </div>
          <p>Simpler journeys, one pass at a time.</p>
          <button onClick={() => go("admin-login")}>
            Administrator portal
          </button>
        </div>
      </footer>
    </div>
  )
}

function Home({ go }: { go: (view: View) => void }) {
  return (
    <>
      <section className="hero">
        <div className="hero-glow" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">A better way to move</span>
            <h1>
              Your bus pass.
              <br />
              <em>Always within reach.</em>
            </h1>
            <p>
              Book, manage, and carry a secure digital bus pass from any device.
              No queues, no paper, no missed journeys.
            </p>
            <div className="button-row">
              <button className="button primary" onClick={() => go("register")}>
                Get your digital pass <Icon name="arrow" />
              </button>
              <button className="button secondary" onClick={() => go("login")}>
                Sign in
              </button>
            </div>
            <div className="proof-row">
              <div>
                <b>24/7</b>
                <span>Pass access</span>
              </div>
              <div>
                <b>3</b>
                <span>Flexible plans</span>
              </div>
              <div>
                <b>100%</b>
                <span>Digital</span>
              </div>
            </div>
          </div>
          <div className="route-card">
            <div className="route-head">
              <span>LIVE ROUTE 24</span>
              <b>
                <i /> ON TIME
              </b>
            </div>
            <div className="bus-art">
              <div className="bus-sign">24 &nbsp; UNIVERSITY</div>
              <div className="window-row">
                <i />
                <i />
                <i />
                <i className="door" />
              </div>
              <span className="wheel left" />
              <span className="wheel right" />
            </div>
            <div className="route-track">
              <i />
              <span />
              <i />
              <span />
              <i />
            </div>
            <div className="route-names">
              <span>Central</span>
              <span>University</span>
              <span>Tech Park</span>
            </div>
            <div className="next-stop">
              <span>Next stop</span>
              <b>University Gate · 3 min</b>
            </div>
          </div>
        </div>
      </section>
      <section className="features">
        <div className="container">
          <div className="section-title">
            <span className="eyebrow">Made for everyday travel</span>
            <h2>
              Everything you need.
              <br />
              Nothing you don&apos;t.
            </h2>
          </div>
          <div className="feature-grid">
            {[
              [
                "01",
                "ticket",
                "Book in minutes",
                "Choose your route and duration through one clear, guided booking flow.",
              ],
              [
                "02",
                "shield",
                "Travel with confidence",
                "Every pass has a unique ID and digital verification code.",
              ],
              [
                "03",
                "clock",
                "Stay in control",
                "See live status, expiry dates, and your complete travel history.",
              ],
            ].map(([number, icon, title, copy]) => (
              <article className="feature-card" key={number}>
                <div className="feature-top">
                  <span>{number}</span>
                  <i>
                    <Icon name={icon as "ticket"} />
                  </i>
                </div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="cta-band">
        <div className="container cta-inner">
          <div>
            <span className="eyebrow light">Ready when you are</span>
            <h2>Your next journey starts here.</h2>
          </div>
          <button className="button light" onClick={() => go("register")}>
            Create free account <Icon name="arrow" />
          </button>
        </div>
      </section>
    </>
  )
}

function Register({
  users,
  onRegister,
  go,
  notify,
}: {
  users: User[]
  onRegister: (user: User) => void
  go: (view: View) => void
  notify: (message: string, type?: Toast["type"]) => void
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get("email")).trim().toLowerCase()
    const password = String(form.get("password"))
    if (users.some((item) => item.email.toLowerCase() === email)) {
      notify("An account with this email already exists.", "error")
      return
    }
    if (
      password.length < 8 ||
      !/[A-Za-z]/.test(password) ||
      !/\d/.test(password)
    ) {
      notify("Password needs 8 characters, a letter, and a number.", "error")
      return
    }
    onRegister({
      id: Math.max(0, ...users.map((item) => item.id)) + 1,
      name: String(form.get("name")).trim(),
      email,
      phone: String(form.get("phone")).trim(),
      address: String(form.get("address")).trim(),
      password,
      joined: today(),
    })
  }
  return (
    <AuthLayout
      eyebrow="Join SmartBus Cloud"
      title="Create your travel account"
      copy="One account gives you instant access to digital passes and journey history."
    >
      <form className="form-grid" onSubmit={submit}>
        <Field label="Full name">
          <input
            name="name"
            placeholder="Your full name"
            required
            minLength={2}
          />
        </Field>
        <Field label="Email address">
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            required
          />
        </Field>
        <Field label="Phone number">
          <input
            name="phone"
            placeholder="+1 555 000 000"
            required
            minLength={7}
          />
        </Field>
        <Field
          label="Password"
          hint="At least 8 characters, with a letter and number."
        >
          <input
            name="password"
            type="password"
            placeholder="Create a secure password"
            required
          />
        </Field>
        <Field label="Home address">
          <textarea
            name="address"
            placeholder="Street, city, postal code"
            required
            minLength={5}
          />
        </Field>
        <button className="button primary wide" type="submit">
          Create my account <Icon name="arrow" />
        </button>
      </form>
      <p className="form-switch">
        Already registered? <button onClick={() => go("login")}>Sign in</button>
      </p>
    </AuthLayout>
  )
}

function Login({
  users,
  onLogin,
  go,
  notify,
}: {
  users: User[]
  onLogin: (id: number) => void
  go: (view: View) => void
  notify: (message: string, type?: Toast["type"]) => void
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const found = users.find(
      (item) =>
        item.email.toLowerCase() === email.trim().toLowerCase() &&
        item.password === password,
    )
    if (!found) return notify("Email or password is incorrect.", "error")
    onLogin(found.id)
  }
  const useDemo = () => {
    setEmail("maya@example.com")
    setPassword("Pass1234")
  }
  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Continue your journey"
      copy="Sign in to access passes, bookings, and your profile."
    >
      <form onSubmit={submit}>
        <Field label="Email address">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="Your password"
          />
        </Field>
        <button className="button primary wide" type="submit">
          Sign in <Icon name="arrow" />
        </button>
      </form>
      <button className="demo-fill" onClick={useDemo}>
        Use demo passenger account
      </button>
      <p className="form-switch">
        New to SmartBus?{" "}
        <button onClick={() => go("register")}>Create an account</button>
      </p>
    </AuthLayout>
  )
}

function AuthLayout({
  eyebrow,
  title,
  copy,
  children,
}: {
  eyebrow: string
  title: string
  copy: string
  children: ReactNode
}) {
  return (
    <section className="auth-page">
      <div className="auth-side">
        <div className="auth-side-content">
          <span className="eyebrow light">Move smarter</span>
          <h2>
            One pass.
            <br />
            Every journey.
          </h2>
          <p>A secure, simple way to keep the city moving.</p>
          <div className="mini-route">
            <i />
            <span />
            <i />
            <span />
            <i />
          </div>
        </div>
      </div>
      <div className="auth-main">
        <div className="auth-card">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p className="auth-copy">{copy}</p>
          {children}
        </div>
      </div>
    </section>
  )
}

function Dashboard({
  user,
  passes,
  go,
  openPass,
}: {
  user: User
  passes: BusPass[]
  go: (view: View) => void
  openPass: (id: number) => void
}) {
  const active = passes.filter((item) => item.status === "Active").length
  return (
    <>
      <PageHero
        eyebrow="Your travel hub"
        title={`Hello, ${user.name.split(" ")[0]}`}
        copy="Where are you heading next?"
      />
      <section className="content-section pull-up">
        <div className="container">
          <div className="stats-grid">
            <Stat label="Total passes" value={passes.length} icon="ticket" />
            <Stat label="Active now" value={active} icon="clock" accent />
            <button className="new-pass-card" onClick={() => go("book")}>
              <span>
                <Icon name="plus" />
              </span>
              <small>Plan a journey</small>
              <b>
                Book a new pass <Icon name="arrow" />
              </b>
            </button>
          </div>
          <div className="panel recent-panel">
            <PanelHead
              eyebrow="Latest activity"
              title="Recent passes"
              action="View all"
              onAction={() => go("history")}
            />
            {passes.length ? (
              <PassTable passes={passes.slice(0, 4)} openPass={openPass} />
            ) : (
              <Empty
                title="No passes yet"
                copy="Your booked passes will appear here."
                action="Book your first pass"
                onAction={() => go("book")}
              />
            )}
          </div>
          <div className="shortcut-grid">
            <Shortcut
              icon="plus"
              title="Book bus pass"
              copy="Create a new travel pass"
              onClick={() => go("book")}
            />
            <Shortcut
              icon="clock"
              title="Booking history"
              copy="Review every journey"
              onClick={() => go("history")}
            />
            <Shortcut
              icon="user"
              title="Your profile"
              copy="Update account details"
              onClick={() => go("profile")}
            />
          </div>
        </div>
      </section>
    </>
  )
}

function BookPass({
  user,
  onBook,
}: {
  user: User
  onBook: (pass: BusPass) => void
}) {
  const [type, setType] = useState<BusPass["type"]>("Weekly")
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const issueDate = String(form.get("date"))
    const duration = { Daily: 1, Weekly: 7, Monthly: 30 }[type]
    onBook({
      id: Date.now(),
      passId: `SCBP-${today().replace(/-/g, "").slice(2)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      userId: user.id,
      passenger: String(form.get("passenger")).trim(),
      source: String(form.get("source")).trim(),
      destination: String(form.get("destination")).trim(),
      type,
      issueDate,
      expiryDate: addDays(issueDate, duration - 1),
      status: "Active",
      createdAt: today(),
    })
  }
  return (
    <>
      <PageHero
        eyebrow="New booking"
        title="Plan your next journey"
        copy="Choose a route and the pass that fits your schedule."
        compact
      />
      <section className="content-section pull-up">
        <div className="container">
          <form className="panel booking-panel" onSubmit={submit}>
            <FormSection
              number="1"
              title="Passenger"
              copy="Who will use this pass?"
            />
            <Field label="Passenger name">
              <input
                name="passenger"
                defaultValue={user.name}
                required
                minLength={2}
              />
            </Field>
            <div className="section-divider" />
            <FormSection
              number="2"
              title="Route and validity"
              copy="Tell us where and when you travel."
            />
            <div className="two-cols">
              <Field label="From">
                <input
                  name="source"
                  placeholder="Central Station"
                  required
                  minLength={2}
                />
              </Field>
              <Field label="To">
                <input
                  name="destination"
                  placeholder="University Gate"
                  required
                  minLength={2}
                />
              </Field>
              <Field label="Starts on">
                <input
                  name="date"
                  type="date"
                  defaultValue={today()}
                  min={today()}
                  required
                />
              </Field>
            </div>
            <div className="pass-choice-label">Choose pass type</div>
            <div className="pass-choices">
              {([
                ["Daily", "1 day"],
                ["Weekly", "7 days"],
                ["Monthly", "30 days"],
              ] as const).map(([name, duration]) => (
                <button
                  className={type === name ? "selected" : ""}
                  type="button"
                  onClick={() => setType(name)}
                  key={name}
                >
                  <i>
                    <Icon name={type === name ? "check" : "ticket"} />
                  </i>
                  <b>{name}</b>
                  <span>{duration}</span>
                </button>
              ))}
            </div>
            <div className="booking-summary">
              <div>
                <span>Selected plan</span>
                <b>{type} pass</b>
              </div>
              <div>
                <span>Validity</span>
                <b>
                  {type === "Daily"
                    ? "1 day"
                    : type === "Weekly"
                      ? "7 days"
                      : "30 days"}
                </b>
              </div>
            </div>
            <button className="button primary wide" type="submit">
              Confirm and create pass <Icon name="arrow" />
            </button>
          </form>
        </div>
      </section>
    </>
  )
}

function History({
  passes,
  go,
  openPass,
}: {
  passes: BusPass[]
  go: (view: View) => void
  openPass: (id: number) => void
}) {
  const [filter, setFilter] = useState<"All" | BusPass["status"]>("All")
  const visible =
    filter === "All" ? passes : passes.filter((item) => item.status === filter)
  return (
    <>
      <PageHero
        eyebrow="Travel records"
        title="My passes"
        copy="Every booking, all in one place."
        compact
        action={
          <button className="button light" onClick={() => go("book")}>
            <Icon name="plus" /> Book new pass
          </button>
        }
      />
      <section className="content-section pull-up">
        <div className="container">
          <div className="panel">
            <div className="tabs">
              {(["All", "Active", "Expired", "Cancelled"] as const).map(
                (item) => (
                  <button
                    className={filter === item ? "active" : ""}
                    onClick={() => setFilter(item)}
                    key={item}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
            {visible.length ? (
              <PassTable passes={visible} openPass={openPass} />
            ) : (
              <Empty
                title="No passes found"
                copy="There are no passes in this category."
                action="Book a pass"
                onAction={() => go("book")}
              />
            )}
          </div>
        </div>
      </section>
    </>
  )
}

function PassView({ pass, go }: PassViewProps) {
  if (!pass) return <AccessRequired go={go} />
  return (
    <section className="pass-page">
      <div className="container narrow">
        <div className="pass-actions">
          <button onClick={() => go("history")}>&larr; My passes</button>
          <button className="button primary" onClick={() => window.print()}>
            Print pass
          </button>
        </div>
        <article className="digital-pass">
          <div className="pass-top">
            <div className="pass-logo">
              <span className="brand-symbol small">
                <Icon name="bus" size={18} />
              </span>
              <b>SmartBus Cloud</b>
            </div>
            <Status value={pass.status} />
          </div>
          <div className="pass-route">
            <strong>{pass.source}</strong>
            <div>
              <i />
              <Icon name="arrow" />
              <i />
            </div>
            <strong>{pass.destination}</strong>
          </div>
          <div className="pass-main">
            <div className="pass-data">
              <Data label="Passenger" value={pass.passenger} />
              <Data label="Pass type" value={`${pass.type} pass`} />
              <Data label="Valid from" value={displayDate(pass.issueDate)} />
              <Data label="Valid until" value={displayDate(pass.expiryDate)} />
            </div>
            <div className="qr-panel">
              <QRPattern value={pass.passId} />
              <span>Digital verification</span>
            </div>
          </div>
          <div className="pass-bottom">
            <div>
              <span>PASS ID</span>
              <b>{pass.passId}</b>
            </div>
            <small>Issued {displayDate(pass.createdAt)}</small>
          </div>
        </article>
        <div className="pass-help">
          <Icon name="shield" />
          <div>
            <b>Ready to board</b>
            <p>
              Present this digital pass when boarding. The production Flask
              application generates a scannable QR code for every booking.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Profile({
  user,
  onUpdate,
  notify,
}: {
  user: User
  onUpdate: (changes: Partial<User>) => void
  notify: (message: string, type?: Toast["type"]) => void
}) {
  const updateProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    onUpdate({
      name: String(form.get("name")),
      phone: String(form.get("phone")),
      address: String(form.get("address")),
    })
  }
  const updatePassword = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const current = String(form.get("current"))
    const password = String(form.get("new"))
    const confirm = String(form.get("confirm"))
    if (current !== user.password)
      return notify("Current password is incorrect.", "error")
    if (password.length < 8 || !/\d/.test(password))
      return notify("Use at least 8 characters and one number.", "error")
    if (password !== confirm)
      return notify("New passwords do not match.", "error")
    onUpdate({ password })
    event.currentTarget.reset()
  }
  return (
    <>
      <PageHero
        eyebrow="Account settings"
        title="Your profile"
        copy="Keep your personal and security details up to date."
        compact
      />
      <section className="content-section pull-up">
        <div className="container profile-grid">
          <form className="panel" onSubmit={updateProfile}>
            <PanelHead eyebrow="Personal details" title="Profile information" />
            <Field label="Full name">
              <input name="name" defaultValue={user.name} required />
            </Field>
            <Field
              label="Email address"
              hint="Email is used as your sign-in ID."
            >
              <input value={user.email} disabled />
            </Field>
            <Field label="Phone number">
              <input name="phone" defaultValue={user.phone} required />
            </Field>
            <Field label="Address">
              <textarea name="address" defaultValue={user.address} required />
            </Field>
            <button className="button primary" type="submit">
              <Icon name="edit" /> Save changes
            </button>
          </form>
          <form className="panel" onSubmit={updatePassword}>
            <PanelHead eyebrow="Security" title="Change password" />
            <Field label="Current password">
              <input name="current" type="password" required />
            </Field>
            <Field label="New password">
              <input name="new" type="password" required />
            </Field>
            <Field label="Confirm new password">
              <input name="confirm" type="password" required />
            </Field>
            <button className="button secondary" type="submit">
              Update password
            </button>
            <div className="security-note">
              <Icon name="shield" />
              <span>
                Your production account uses secure password hashing and
                protected sessions.
              </span>
            </div>
          </form>
        </div>
      </section>
    </>
  )
}

function AdminLogin({
  onLogin,
  go,
  notify,
}: {
  onLogin: () => void
  go: (view: View) => void
  notify: (message: string, type?: Toast["type"]) => void
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (
      email.toLowerCase() !== "admin@smartbus.test" ||
      password !== "Admin123"
    ) {
      return notify("Administrator credentials are incorrect.", "error")
    }
    onLogin()
  }
  return (
    <AuthLayout
      eyebrow="Restricted access"
      title="Administrator portal"
      copy="Sign in with an authorized administrator account."
    >
      <div className="demo-credentials">
        <span>Demo credentials</span>
        <b>admin@smartbus.test</b>
        <b>Admin123</b>
      </div>
      <form onSubmit={submit}>
        <Field label="Administrator email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <Field label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <button className="button primary wide" type="submit">
          Access dashboard <Icon name="arrow" />
        </button>
      </form>
      <p className="form-switch">
        <button onClick={() => go("home")}>
          &larr; Return to passenger site
        </button>
      </p>
    </AuthLayout>
  )
}

function AdminDashboard({
  users,
  passes,
  go,
}: {
  users: User[]
  passes: BusPass[]
  go: (view: View) => void
}) {
  const currentPasses = passes.map((item) => ({
    ...item,
    status: statusFor(item),
  }))
  return (
    <>
      <PageHero
        eyebrow="Operations centre"
        title="System overview"
        copy="Here is the current network snapshot."
      />
      <section className="content-section pull-up">
        <div className="container">
          <div className="stats-grid">
            <Stat label="Registered users" value={users.length} icon="users" />
            <Stat label="Total passes" value={passes.length} icon="ticket" />
            <Stat
              label="Active passes"
              value={
                currentPasses.filter((item) => item.status === "Active").length
              }
              icon="clock"
              accent
            />
          </div>
          <div className="admin-columns">
            <div className="panel">
              <PanelHead
                eyebrow="System activity"
                title="Recent passes"
                action="Manage all"
                onAction={() => go("admin-passes")}
              />
              <AdminPassTable
                passes={currentPasses.slice(0, 5)}
                users={users}
              />
            </div>
            <div className="panel">
              <PanelHead eyebrow="Quick access" title="Management" />
              <div className="management-links">
                <button onClick={() => go("admin-users")}>
                  <i>
                    <Icon name="users" />
                  </i>
                  <span>
                    <b>Manage users</b>
                    <small>Search and review accounts</small>
                  </span>
                  <Icon name="chevron" />
                </button>
                <button onClick={() => go("admin-passes")}>
                  <i>
                    <Icon name="ticket" />
                  </i>
                  <span>
                    <b>Manage passes</b>
                    <small>Review current pass status</small>
                  </span>
                  <Icon name="chevron" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

function AdminUsers({
  users,
  passes,
  selectedUserId,
  setSelectedUserId,
  onDelete,
}: {
  users: User[]
  passes: BusPass[]
  selectedUserId: number | null
  setSelectedUserId: (id: number | null) => void
  onDelete: (id: number) => void
}) {
  const [query, setQuery] = useState("")
  const filtered = users.filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase()),
  )
  const selected = users.find((item) => item.id === selectedUserId)
  return (
    <>
      <PageHero
        eyebrow="Administration"
        title="Registered users"
        copy="Search and manage passenger accounts."
        compact
      />
      <section className="content-section pull-up">
        <div className="container">
          <div className="panel">
            <div className="search-box">
              <Icon name="search" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or email"
              />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Phone</th>
                    <th>Joined</th>
                    <th>Passes</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="user-cell">
                          <span>
                            {user.name
                              .split(" ")
                              .map((word) => word[0])
                              .join("")
                              .slice(0, 2)}
                          </span>
                          <div>
                            <b>{user.name}</b>
                            <small>{user.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{user.phone}</td>
                      <td>{displayDate(user.joined)}</td>
                      <td>
                        {
                          passes.filter((item) => item.userId === user.id)
                            .length
                        }
                      </td>
                      <td>
                        <button
                          className="table-action"
                          onClick={() => setSelectedUserId(user.id)}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filtered.length && (
              <Empty
                title="No users found"
                copy="Try another name or email address."
              />
            )}
          </div>
        </div>
      </section>
      {selected && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setSelectedUserId(null)}
        >
          <aside
            className="user-drawer"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              className="drawer-close"
              onClick={() => setSelectedUserId(null)}
            >
              <Icon name="close" />
            </button>
            <div className="large-avatar">
              {selected.name
                .split(" ")
                .map((word) => word[0])
                .join("")
                .slice(0, 2)}
            </div>
            <h2>{selected.name}</h2>
            <p>{selected.email}</p>
            <div className="detail-stack">
              <Data label="Phone" value={selected.phone} />
              <Data label="Address" value={selected.address} />
              <Data label="Member since" value={displayDate(selected.joined)} />
              <Data
                label="Total passes"
                value={String(
                  passes.filter((item) => item.userId === selected.id).length,
                )}
              />
            </div>
            <button
              className="button danger wide"
              onClick={() =>
                window.confirm("Delete this user and all associated passes?") &&
                onDelete(selected.id)
              }
            >
              Delete user
            </button>
          </aside>
        </div>
      )}
    </>
  )
}

function AdminPasses({
  passes,
  users,
  onStatus,
}: {
  passes: BusPass[]
  users: User[]
  onStatus: (id: number, status: "Active" | "Cancelled") => void
}) {
  const [filter, setFilter] = useState<"All" | BusPass["status"]>("All")
  const current = passes.map((item) => ({ ...item, status: statusFor(item) }))
  const visible =
    filter === "All"
      ? current
      : current.filter((item) => item.status === filter)
  return (
    <>
      <PageHero
        eyebrow="Administration"
        title="Bus passes"
        copy="Review and manage every issued pass."
        compact
      />
      <section className="content-section pull-up">
        <div className="container">
          <div className="panel">
            <div className="tabs">
              {(["All", "Active", "Expired", "Cancelled"] as const).map(
                (item) => (
                  <button
                    className={filter === item ? "active" : ""}
                    onClick={() => setFilter(item)}
                    key={item}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Pass and user</th>
                    <th>Route</th>
                    <th>Validity</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((pass) => {
                    const owner = users.find((item) => item.id === pass.userId)
                    return (
                      <tr key={pass.id}>
                        <td>
                          <b>{pass.passId}</b>
                          <small>
                            {owner?.name ?? "Deleted user"} · {pass.type}
                          </small>
                        </td>
                        <td>
                          <b>{pass.source}</b>
                          <small>to {pass.destination}</small>
                        </td>
                        <td>
                          {displayDate(pass.issueDate)}
                          <small>to {displayDate(pass.expiryDate)}</small>
                        </td>
                        <td>
                          <Status value={pass.status} />
                        </td>
                        <td>
                          {pass.status === "Active" ? (
                            <button
                              className="table-action danger-text"
                              onClick={() =>
                                window.confirm("Cancel this pass?") &&
                                onStatus(pass.id, "Cancelled")
                              }
                            >
                              Cancel
                            </button>
                          ) : pass.status === "Cancelled" &&
                            pass.expiryDate >= today() ? (
                            <button
                              className="table-action"
                              onClick={() => onStatus(pass.id, "Active")}
                            >
                              Reactivate
                            </button>
                          ) : (
                            <span className="muted">No action</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {!visible.length && (
              <Empty
                title="No passes found"
                copy="There are no records in this category."
              />
            )}
          </div>
        </div>
      </section>
    </>
  )
}

function PageHero({
  eyebrow,
  title,
  copy,
  compact,
  action,
}: {
  eyebrow: string
  title: string
  copy: string
  compact?: boolean
  action?: ReactNode
}) {
  return (
    <section className={`page-hero ${compact ? "compact" : ""}`}>
      <div className="container page-hero-inner">
        <div>
          <span className="eyebrow light">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{copy}</p>
        </div>
        {action}
      </div>
    </section>
  )
}

function Stat({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number
  icon: "ticket" | "clock" | "users"
  accent?: boolean
}) {
  return (
    <article className={`stat-card ${accent ? "accent" : ""}`}>
      <div>
        <span>{label}</span>
        <i>
          <Icon name={icon} />
        </i>
      </div>
      <b>{String(value).padStart(2, "0")}</b>
      <small>{accent ? "Ready to use" : "All time"}</small>
    </article>
  )
}

function PanelHead({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow: string
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="panel-head">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {action && (
        <button onClick={onAction}>
          {action} <Icon name="arrow" size={17} />
        </button>
      )}
    </div>
  )
}

function PassTable({
  passes,
  openPass,
}: {
  passes: BusPass[]
  openPass: (id: number) => void
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Pass</th>
            <th>Route</th>
            <th>Type</th>
            <th>Expires</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {passes.map((pass) => (
            <tr key={pass.id}>
              <td>
                <b>{pass.passId}</b>
                <small>{displayDate(pass.createdAt)}</small>
              </td>
              <td>
                <b>{pass.source}</b>
                <small>to {pass.destination}</small>
              </td>
              <td>{pass.type}</td>
              <td>{displayDate(pass.expiryDate)}</td>
              <td>
                <Status value={pass.status} />
              </td>
              <td>
                <button
                  className="table-action"
                  onClick={() => openPass(pass.id)}
                >
                  Open
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AdminPassTable({
  passes,
  users,
}: {
  passes: BusPass[]
  users: User[]
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Route</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {passes.map((pass) => (
            <tr key={pass.id}>
              <td>
                <b>
                  {users.find((item) => item.id === pass.userId)?.name ??
                    "Deleted user"}
                </b>
                <small>{pass.passId}</small>
              </td>
              <td>
                {pass.source}
                <small>to {pass.destination}</small>
              </td>
              <td>{pass.type}</td>
              <td>
                <Status value={pass.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Shortcut({
  icon,
  title,
  copy,
  onClick,
}: {
  icon: "plus" | "clock" | "user"
  title: string
  copy: string
  onClick: () => void
}) {
  return (
    <button className="shortcut" onClick={onClick}>
      <i>
        <Icon name={icon} />
      </i>
      <span>
        <b>{title}</b>
        <small>{copy}</small>
      </span>
      <Icon name="chevron" />
    </button>
  )
}

function FormSection({
  number,
  title,
  copy,
}: {
  number: string
  title: string
  copy: string
}) {
  return (
    <div className="form-section-title">
      <span>{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{copy}</p>
      </div>
    </div>
  )
}

function Data({ label, value }: DataProps) {
  return (
    <div className="data-item">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}

function Empty({
  title,
  copy,
  action,
  onAction,
}: {
  title: string
  copy: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="empty">
      <i>
        <Icon name="ticket" />
      </i>
      <h3>{title}</h3>
      <p>{copy}</p>
      {action && (
        <button className="button primary" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  )
}

function AccessRequired({
  admin,
  go,
}: {
  admin?: boolean
  go: (view: View) => void
}) {
  return (
    <section className="access-page">
      <div>
        <i>
          <Icon name="shield" size={30} />
        </i>
        <span className="eyebrow">Protected area</span>
        <h1>Sign in to continue</h1>
        <p>
          This page is available to authorized{" "}
          {admin ? "administrators" : "passengers"}.
        </p>
        <button
          className="button primary"
          onClick={() => go(admin ? "admin-login" : "login")}
        >
          Go to sign in
        </button>
      </div>
    </section>
  )
}
