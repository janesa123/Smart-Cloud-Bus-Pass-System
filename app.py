import os
import re
import secrets
import sqlite3
from datetime import date, timedelta
from functools import wraps
from pathlib import Path

import click
import qrcode
from dotenv import load_dotenv
from flask import (
    Flask,
    abort,
    flash,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from flask_wtf.csrf import CSRFError, CSRFProtect
from werkzeug.security import check_password_hash, generate_password_hash

from database import get_db, init_app as init_database, sync_expired_passes


load_dotenv()
BASE_DIR = Path(__file__).resolve().parent
EMAIL_PATTERN = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$")
PHONE_PATTERN = re.compile(r"^[0-9+()\-\s]{7,20}$")
PASS_DURATIONS = {"Daily": 1, "Weekly": 7, "Monthly": 30}

app = Flask(__name__)
app.config.update(
    SECRET_KEY=os.getenv("SECRET_KEY", secrets.token_hex(32)),
    DATABASE=os.getenv("DATABASE_PATH", str(BASE_DIR / "instance" / "bus_pass.db")),
    MAX_CONTENT_LENGTH=2 * 1024 * 1024,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)
CSRFProtect(app)
init_database(app)
(BASE_DIR / "static" / "qrcodes").mkdir(parents=True, exist_ok=True)


def normalize_email(value):
    return value.strip().lower()


def validate_password(password):
    if len(password) < 8:
        return "Password must contain at least 8 characters."
    if not re.search(r"[A-Za-z]", password) or not re.search(r"\d", password):
        return "Password must include at least one letter and one number."
    return None


def login_required(view):
    @wraps(view)
    def wrapped_view(**kwargs):
        if not session.get("user_id"):
            flash("Please log in to continue.", "warning")
            return redirect(url_for("login", next=request.path))
        return view(**kwargs)

    return wrapped_view


def admin_required(view):
    @wraps(view)
    def wrapped_view(**kwargs):
        if not session.get("admin_id") or session.get("admin_role") != "admin":
            flash("Administrator access is required.", "danger")
            return redirect(url_for("admin_login"))
        return view(**kwargs)

    return wrapped_view


def current_user():
    user_id = session.get("user_id")
    if not user_id:
        return None
    return get_db().execute(
        "SELECT id, full_name, email, phone, address, role, created_at FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()


def create_admin(email, password, full_name="System Administrator"):
    email = normalize_email(email)
    if not EMAIL_PATTERN.fullmatch(email):
        raise ValueError("A valid administrator email is required.")
    password_error = validate_password(password)
    if password_error:
        raise ValueError(password_error)
    database = get_db()
    existing = database.execute("SELECT id, role FROM users WHERE email = ?", (email,)).fetchone()
    if existing:
        if existing["role"] == "admin":
            return False
        raise ValueError("That email belongs to a regular user.")
    database.execute(
        """
        INSERT INTO users (full_name, email, phone, address, password_hash, role)
        VALUES (?, ?, ?, ?, ?, 'admin')
        """,
        (full_name.strip(), email, "Not provided", "Administration", generate_password_hash(password)),
    )
    database.commit()
    return True


def bootstrap_admin_from_environment():
    email = os.getenv("INITIAL_ADMIN_EMAIL", "").strip()
    password = os.getenv("INITIAL_ADMIN_PASSWORD", "")
    if email and password:
        try:
            create_admin(email, password, os.getenv("INITIAL_ADMIN_NAME", "System Administrator"))
        except ValueError as error:
            app.logger.warning("Initial admin was not created: %s", error)


with app.app_context():
    bootstrap_admin_from_environment()


@app.context_processor
def inject_globals():
    return {"current_user": current_user()}


@app.cli.command("create-admin")
@click.option("--email", prompt=True)
@click.option("--name", prompt="Full name", default="System Administrator")
@click.password_option(confirmation_prompt=True)
def create_admin_command(email, name, password):
    """Create the first administrator without hardcoded credentials."""
    try:
        created = create_admin(email, password, name)
    except ValueError as error:
        raise click.ClickException(str(error)) from error
    if not created:
        click.echo("An administrator with that email already exists.")
        return
    click.echo("Administrator created successfully.")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if session.get("user_id"):
        return redirect(url_for("dashboard"))
    if request.method == "POST":
        full_name = request.form.get("full_name", "").strip()
        email = normalize_email(request.form.get("email", ""))
        phone = request.form.get("phone", "").strip()
        address = request.form.get("address", "").strip()
        password = request.form.get("password", "")
        errors = []
        if len(full_name) < 2 or len(full_name) > 100:
            errors.append("Full name must be between 2 and 100 characters.")
        if not EMAIL_PATTERN.fullmatch(email):
            errors.append("Enter a valid email address.")
        if not PHONE_PATTERN.fullmatch(phone):
            errors.append("Enter a valid phone number.")
        if len(address) < 5 or len(address) > 300:
            errors.append("Address must be between 5 and 300 characters.")
        password_error = validate_password(password)
        if password_error:
            errors.append(password_error)
        if errors:
            for error in errors:
                flash(error, "danger")
            return render_template("register.html"), 400
        try:
            database = get_db()
            database.execute(
                """
                INSERT INTO users (full_name, email, phone, address, password_hash)
                VALUES (?, ?, ?, ?, ?)
                """,
                (full_name, email, phone, address, generate_password_hash(password)),
            )
            database.commit()
        except sqlite3.IntegrityError:
            flash("An account with that email already exists.", "danger")
            return render_template("register.html"), 409
        flash("Registration successful. Please log in.", "success")
        return redirect(url_for("login"))
    return render_template("register.html")


@app.route("/login", methods=["GET", "POST"])
def login():
    if session.get("user_id"):
        return redirect(url_for("dashboard"))
    if request.method == "POST":
        email = normalize_email(request.form.get("email", ""))
        password = request.form.get("password", "")
        user = get_db().execute(
            "SELECT * FROM users WHERE email = ? AND role = 'user'", (email,)
        ).fetchone()
        if not user or not check_password_hash(user["password_hash"], password):
            flash("Invalid email or password.", "danger")
            return render_template("login.html"), 401
        session.clear()
        session["user_id"] = user["id"]
        flash(f"Welcome back, {user['full_name']}!", "success")
        next_url = request.args.get("next", "")
        return redirect(next_url if next_url.startswith("/") and not next_url.startswith("//") else url_for("dashboard"))
    return render_template("login.html")


@app.post("/logout")
def logout():
    session.clear()
    flash("You have been logged out safely.", "success")
    return redirect(url_for("index"))


@app.route("/dashboard")
@login_required
def dashboard():
    sync_expired_passes()
    database = get_db()
    user_id = session["user_id"]
    stats = database.execute(
        """
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) AS active
        FROM bus_passes WHERE user_id = ?
        """,
        (user_id,),
    ).fetchone()
    recent_passes = database.execute(
        "SELECT * FROM bus_passes WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 5",
        (user_id,),
    ).fetchall()
    return render_template("dashboard.html", stats=stats, passes=recent_passes)


@app.route("/book", methods=["GET", "POST"])
@login_required
def book_pass():
    user = current_user()
    if request.method == "POST":
        passenger_name = request.form.get("passenger_name", "").strip()
        source = request.form.get("source", "").strip()
        destination = request.form.get("destination", "").strip()
        pass_type = request.form.get("pass_type", "")
        issue_date_value = request.form.get("issue_date", "")
        errors = []
        if len(passenger_name) < 2 or len(passenger_name) > 100:
            errors.append("Passenger name must be between 2 and 100 characters.")
        if len(source) < 2 or len(source) > 100:
            errors.append("Enter a valid source.")
        if len(destination) < 2 or len(destination) > 100:
            errors.append("Enter a valid destination.")
        if source.casefold() == destination.casefold():
            errors.append("Source and destination must be different.")
        if pass_type not in PASS_DURATIONS:
            errors.append("Select a valid pass type.")
        try:
            issue_date = date.fromisoformat(issue_date_value)
            if issue_date < date.today():
                errors.append("Issue date cannot be in the past.")
            if issue_date > date.today() + timedelta(days=30):
                errors.append("Issue date cannot be more than 30 days ahead.")
        except ValueError:
            issue_date = date.today()
            errors.append("Enter a valid issue date.")
        if errors:
            for error in errors:
                flash(error, "danger")
            return render_template("book.html", today=date.today().isoformat(), user=user), 400

        expiry_date = issue_date + timedelta(days=PASS_DURATIONS[pass_type] - 1)
        pass_id = f"SCBP-{date.today():%Y%m%d}-{secrets.token_hex(4).upper()}"
        qr_filename = f"{pass_id}.png"
        qr_relative_path = f"qrcodes/{qr_filename}"
        qr_payload = (
            f"Smart Cloud Bus Pass\nPass ID: {pass_id}\nPassenger: {passenger_name}\n"
            f"Route: {source} to {destination}\nValid: {issue_date} to {expiry_date}"
        )
        qr = qrcode.QRCode(version=1, box_size=8, border=3)
        qr.add_data(qr_payload)
        qr.make(fit=True)
        qr.make_image(fill_color="#092c4c", back_color="white").save(
            BASE_DIR / "static" / qr_relative_path
        )
        try:
            database = get_db()
            cursor = database.execute(
                """
                INSERT INTO bus_passes
                (pass_id, user_id, passenger_name, source, destination, pass_type,
                 issue_date, expiry_date, status, qr_code_path)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)
                """,
                (
                    pass_id,
                    session["user_id"],
                    passenger_name,
                    source,
                    destination,
                    pass_type,
                    issue_date.isoformat(),
                    expiry_date.isoformat(),
                    qr_relative_path,
                ),
            )
            database.commit()
        except sqlite3.Error:
            (BASE_DIR / "static" / qr_relative_path).unlink(missing_ok=True)
            app.logger.exception("Could not save bus pass")
            flash("The pass could not be booked. Please try again.", "danger")
            return render_template("book.html", today=date.today().isoformat(), user=user), 500
        return redirect(url_for("booking_success", pass_record_id=cursor.lastrowid))
    return render_template("book.html", today=date.today().isoformat(), user=user)


def get_owned_pass(pass_record_id):
    pass_record = get_db().execute(
        "SELECT * FROM bus_passes WHERE id = ? AND user_id = ?",
        (pass_record_id, session["user_id"]),
    ).fetchone()
    if not pass_record:
        abort(404)
    return pass_record


@app.route("/booking/success/<int:pass_record_id>")
@login_required
def booking_success(pass_record_id):
    return render_template("success.html", bus_pass=get_owned_pass(pass_record_id))


@app.route("/passes/<int:pass_record_id>")
@login_required
def view_pass(pass_record_id):
    sync_expired_passes()
    return render_template("pass.html", bus_pass=get_owned_pass(pass_record_id))


@app.route("/history")
@login_required
def history():
    sync_expired_passes()
    passes = get_db().execute(
        "SELECT * FROM bus_passes WHERE user_id = ? ORDER BY created_at DESC, id DESC",
        (session["user_id"],),
    ).fetchall()
    return render_template("history.html", passes=passes)


@app.route("/profile", methods=["GET", "POST"])
@login_required
def profile():
    database = get_db()
    user = current_user()
    if request.method == "POST":
        action = request.form.get("action")
        if action == "profile":
            full_name = request.form.get("full_name", "").strip()
            phone = request.form.get("phone", "").strip()
            address = request.form.get("address", "").strip()
            if not 2 <= len(full_name) <= 100 or not PHONE_PATTERN.fullmatch(phone) or not 5 <= len(address) <= 300:
                flash("Please provide valid profile details.", "danger")
                return render_template("profile.html", user=user), 400
            database.execute(
                "UPDATE users SET full_name = ?, phone = ?, address = ? WHERE id = ?",
                (full_name, phone, address, session["user_id"]),
            )
            database.commit()
            flash("Profile updated successfully.", "success")
        elif action == "password":
            current_password = request.form.get("current_password", "")
            new_password = request.form.get("new_password", "")
            confirmation = request.form.get("confirm_password", "")
            account = database.execute(
                "SELECT password_hash FROM users WHERE id = ?", (session["user_id"],)
            ).fetchone()
            password_error = validate_password(new_password)
            if not check_password_hash(account["password_hash"], current_password):
                flash("Current password is incorrect.", "danger")
                return render_template("profile.html", user=user), 400
            if password_error:
                flash(password_error, "danger")
                return render_template("profile.html", user=user), 400
            if new_password != confirmation:
                flash("New passwords do not match.", "danger")
                return render_template("profile.html", user=user), 400
            database.execute(
                "UPDATE users SET password_hash = ? WHERE id = ?",
                (generate_password_hash(new_password), session["user_id"]),
            )
            database.commit()
            flash("Password changed successfully.", "success")
        else:
            abort(400)
        return redirect(url_for("profile"))
    return render_template("profile.html", user=user)


@app.route("/admin/login", methods=["GET", "POST"])
def admin_login():
    if session.get("admin_id"):
        return redirect(url_for("admin_dashboard"))
    if request.method == "POST":
        email = normalize_email(request.form.get("email", ""))
        password = request.form.get("password", "")
        admin = get_db().execute(
            "SELECT * FROM users WHERE email = ? AND role = 'admin'", (email,)
        ).fetchone()
        if not admin or not check_password_hash(admin["password_hash"], password):
            flash("Invalid administrator credentials.", "danger")
            return render_template("admin_login.html"), 401
        session.clear()
        session["admin_id"] = admin["id"]
        session["admin_role"] = admin["role"]
        session["admin_name"] = admin["full_name"]
        return redirect(url_for("admin_dashboard"))
    return render_template("admin_login.html")


@app.post("/admin/logout")
def admin_logout():
    session.clear()
    flash("Administrator session ended.", "success")
    return redirect(url_for("admin_login"))


@app.route("/admin")
@admin_required
def admin_dashboard():
    sync_expired_passes()
    database = get_db()
    stats = database.execute(
        """
        SELECT
          (SELECT COUNT(*) FROM users WHERE role = 'user') AS users,
          (SELECT COUNT(*) FROM bus_passes) AS passes,
          (SELECT COUNT(*) FROM bus_passes WHERE status = 'Active') AS active
        """
    ).fetchone()
    recent_passes = database.execute(
        """
        SELECT bp.*, u.full_name FROM bus_passes bp
        JOIN users u ON u.id = bp.user_id
        ORDER BY bp.created_at DESC, bp.id DESC LIMIT 6
        """
    ).fetchall()
    return render_template("admin.html", stats=stats, passes=recent_passes)


@app.route("/admin/users")
@admin_required
def admin_users():
    query = request.args.get("q", "").strip()
    like_query = f"%{query}%"
    users = get_db().execute(
        """
        SELECT u.id, u.full_name, u.email, u.phone, u.created_at, COUNT(bp.id) AS pass_count
        FROM users u LEFT JOIN bus_passes bp ON bp.user_id = u.id
        WHERE u.role = 'user' AND (u.full_name LIKE ? OR u.email LIKE ?)
        GROUP BY u.id ORDER BY u.created_at DESC
        """,
        (like_query, like_query),
    ).fetchall()
    return render_template("admin_users.html", users=users, query=query)


@app.route("/admin/users/<int:user_id>")
@admin_required
def admin_user_detail(user_id):
    database = get_db()
    user = database.execute(
        """
        SELECT id, full_name, email, phone, address, created_at
        FROM users WHERE id = ? AND role = 'user'
        """,
        (user_id,),
    ).fetchone()
    if not user:
        abort(404)
    passes = database.execute(
        "SELECT * FROM bus_passes WHERE user_id = ? ORDER BY created_at DESC", (user_id,)
    ).fetchall()
    return render_template("admin_user_detail.html", user=user, passes=passes)


@app.post("/admin/users/<int:user_id>/delete")
@admin_required
def admin_delete_user(user_id):
    database = get_db()
    user = database.execute(
        "SELECT id, full_name FROM users WHERE id = ? AND role = 'user'", (user_id,)
    ).fetchone()
    if not user:
        abort(404)
    qr_paths = database.execute(
        "SELECT qr_code_path FROM bus_passes WHERE user_id = ?", (user_id,)
    ).fetchall()
    database.execute("DELETE FROM users WHERE id = ?", (user_id,))
    database.commit()
    for item in qr_paths:
        (BASE_DIR / "static" / item["qr_code_path"]).unlink(missing_ok=True)
    flash(f"{user['full_name']} and their pass records were deleted.", "success")
    return redirect(url_for("admin_users"))


@app.route("/admin/passes")
@admin_required
def admin_passes():
    sync_expired_passes()
    status = request.args.get("status", "")
    if status in {"Active", "Expired", "Cancelled"}:
        passes = get_db().execute(
            """
            SELECT bp.*, u.full_name, u.email FROM bus_passes bp
            JOIN users u ON u.id = bp.user_id
            WHERE bp.status = ? ORDER BY bp.created_at DESC
            """,
            (status,),
        ).fetchall()
    else:
        passes = get_db().execute(
            """
            SELECT bp.*, u.full_name, u.email FROM bus_passes bp
            JOIN users u ON u.id = bp.user_id ORDER BY bp.created_at DESC
            """
        ).fetchall()
    return render_template("admin_passes.html", passes=passes, selected_status=status)


@app.post("/admin/passes/<int:pass_record_id>/status")
@admin_required
def admin_update_pass_status(pass_record_id):
    status = request.form.get("status", "")
    if status not in {"Active", "Cancelled"}:
        abort(400)
    database = get_db()
    pass_record = database.execute(
        "SELECT id, expiry_date FROM bus_passes WHERE id = ?", (pass_record_id,)
    ).fetchone()
    if not pass_record:
        abort(404)
    if status == "Active" and date.fromisoformat(pass_record["expiry_date"]) < date.today():
        flash("An expired pass cannot be reactivated.", "warning")
    else:
        database.execute("UPDATE bus_passes SET status = ? WHERE id = ?", (status, pass_record_id))
        database.commit()
        flash("Pass status updated.", "success")
    return redirect(url_for("admin_passes"))


@app.errorhandler(CSRFError)
def handle_csrf_error(error):
    return render_template("error.html", code=400, message="This form expired or was invalid. Please try again."), 400


@app.errorhandler(400)
def bad_request(_error):
    return render_template("error.html", code=400, message="The request could not be processed."), 400


@app.errorhandler(404)
def not_found(_error):
    return render_template("error.html", code=404, message="The page or record you requested was not found."), 404


@app.errorhandler(500)
def server_error(_error):
    return render_template("error.html", code=500, message="Something went wrong. Please try again later."), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5000")), debug=os.getenv("FLASK_DEBUG") == "1")
