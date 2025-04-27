from app import db, User, app

# Run within the Flask application context
with app.app_context():
    db.create_all()  # Ensures the database tables exist
    user = User(username="admin", password="asad123")  # TODO: Hash password in production
    db.session.add(user)
    db.session.commit()
    print("User created successfully!")