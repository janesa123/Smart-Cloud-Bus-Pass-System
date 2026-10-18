# Smart Cloud Bus Pass System

A complete Flask, Bootstrap 5, and SQLite web application for registering passengers, booking secure digital bus passes, generating QR codes, and administering users and passes.

## Project structure

```text
.
├── app.py                  # Routes, authentication, validation, QR generation
├── database.py             # SQLite connection, schema, and status synchronization
├── requirements.txt
├── .env.example
├── instance/               # Created automatically; contains bus_pass.db
├── static/
│   ├── style.css
│   └── qrcodes/            # Generated QR images
└── templates/
    ├── base.html
    ├── index.html
    ├── register.html
    ├── login.html
    ├── dashboard.html
    ├── book.html
    ├── pass.html
    ├── history.html
    ├── profile.html
    ├── success.html
    ├── admin_login.html
    ├── admin.html
    ├── admin_users.html
    ├── admin_user_detail.html
    ├── admin_passes.html
    └── error.html
```

## Database schema

The database is created automatically on first startup.

- `users`: ID, full name, unique case-insensitive email, phone, address, password hash, role, creation timestamp.
- `bus_passes`: internal ID, unique public pass ID, owner ID, passenger, route, type, validity dates, status, QR path, creation timestamp.
- `bus_passes.user_id` uses `ON DELETE CASCADE`; SQLite foreign keys are enabled for every connection.

## Windows setup in VS Code

1. Install Python 3.10 or newer and open this folder in VS Code.
2. Open **Terminal > New Terminal** and create a virtual environment:

   ```powershell
   py -m venv .venv
   ```

3. Activate it:

   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```

   If PowerShell blocks activation, run `Set-ExecutionPolicy -Scope Process Bypass` once in that terminal, then activate again.

4. Install dependencies:

   ```powershell
   pip install -r requirements.txt
   ```

5. Copy `.env.example` to `.env`:

   ```powershell
   Copy-Item .env.example .env
   ```

6. Edit `.env`. Generate a secure secret with:

   ```powershell
   py -c "import secrets; print(secrets.token_hex(32))"
   ```

   Put the result in `SECRET_KEY`. Replace the example administrator email and password. The password must be at least eight characters and include a letter and number. On first startup, those environment values create the administrator securely. Remove `INITIAL_ADMIN_PASSWORD` from `.env` after the account is created.

7. Start the application:

   ```powershell
   python app.py
   ```

8. Open <http://127.0.0.1:5000>. User login is at `/login`; administrator login is at `/admin/login`.

### Alternative administrator setup

Leave the `INITIAL_ADMIN_*` values blank and run the interactive command:

```powershell
flask --app app create-admin
```

The password prompt is hidden and requires confirmation. No production credentials are hardcoded.

## Features and security

- Secure Werkzeug password hashing and separate user/admin role checks.
- Session cookies use `HttpOnly` and `SameSite=Lax`.
- CSRF protection on every POST form through Flask-WTF.
- Parameterized SQL, unique constraints, and foreign-key enforcement.
- Server-generated pass IDs, QR payloads, and ownership checks that prevent IDOR.
- Automatic expired-status synchronization based on the local date.
- POST-only logout, deletion, and pass-status changes.
- Duplicate email, route, date, phone, password, and profile validation.
- QR cleanup when a user is deleted.
- Responsive Bootstrap interface, printable passes, empty states, and flash feedback.

> For HTTPS deployment, also set `SESSION_COOKIE_SECURE=True` in the Flask configuration and use a production WSGI server. The built-in server is intended only for local development.

## Manual testing checklist

1. Register a user with valid details and confirm login succeeds.
2. Try the same email in different letter casing and confirm registration is rejected.
3. Inspect the SQLite row and confirm `password_hash` is not the original password.
4. Book Daily, Weekly, and Monthly passes; confirm expiry dates are 1, 7, and 30 calendar days inclusive.
5. Open the generated QR image under `static/qrcodes/` and print the pass page.
6. Register a second user and manually request the first user's `/passes/<id>` URL; confirm a 404 response.
7. Visit `/dashboard` while logged out; confirm redirection to login.
8. Visit `/admin` as a user or logged out; confirm access is denied.
9. Sign in as admin, search users by partial name/email, and open a user record.
10. Cancel and reactivate a current pass. Confirm an expired pass cannot be reactivated.
11. Delete a test user and confirm their pass rows and QR images are removed.
12. Set an expiry date in SQLite to yesterday, revisit history, and confirm status becomes `Expired`.

## Troubleshooting

- **`python` is not recognized:** use `py app.py` or reinstall Python with “Add Python to PATH” enabled.
- **PowerShell cannot activate the environment:** run `Set-ExecutionPolicy -Scope Process Bypass`.
- **`ModuleNotFoundError`:** activate `.venv`, then run `pip install -r requirements.txt`.
- **Port 5000 is busy:** set `PORT=5001` in `.env`, restart, and open the new port.
- **Admin login fails:** confirm the email in `.env`, restart once to provision it, or run `flask --app app create-admin`.
- **CSRF/form expired error:** refresh the page before submitting. Do not reuse a form opened before the server restarted with a changed secret.
- **QR image missing:** ensure `static/qrcodes` is writable and Pillow installed through `qrcode[pil]`.
- **Reset local data:** stop the app and delete `instance/bus_pass.db` plus generated PNG files. Restarting recreates an empty database.
DEVELOPED BY
Janessa J 
