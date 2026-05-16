from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = "Users"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=False, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    phone = db.Column(db.String(20), nullable=True)

    student_id = db.Column(db.String(50), nullable=True)
    id_card_image = db.Column(db.String(300), nullable=True)
    verification_status = db.Column(
        db.String(20), nullable=False, default="pending"
    )
    verified_at = db.Column(db.DateTime, nullable=True)
    rejection_reason = db.Column(db.String(255), nullable=True)
    is_admin = db.Column(db.Boolean, default=False, nullable=False)

    bio = db.Column(db.Text, nullable=True)
    course = db.Column(db.String(100), nullable=True)
    year_of_study = db.Column(db.String(30), nullable=True)
    hostel_or_location = db.Column(db.String(120), nullable=True)
    avatar = db.Column(db.String(300), nullable=True)
    interests = db.Column(db.String(255), nullable=True)

    is_suspended = db.Column(db.Boolean, default=False, nullable=False)
    notifications_enabled = db.Column(db.Boolean, default=True, nullable=False)

    admin_notifications = db.relationship(
        "AdminNotification",
        back_populates="user",
        lazy=True,
        cascade="all, delete-orphan",
    )


class AdminNotification(db.Model):
    __tablename__ = "admin_notifications"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    message = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(20), nullable=False, default="info")
    applies_suspend = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    read_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship("User", back_populates="admin_notifications")


class Post(db.Model):
    __tablename__ = "AllPost"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.String, nullable=False)
    image = db.Column(db.String(300), nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    price = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('Users.id'), nullable=False)
    user = db.relationship('User', backref=db.backref('posts', lazy=True))

    checkout_messages = db.relationship('CheckoutMessage', back_populates='post', cascade='all, delete-orphan')

class YourCart(db.Model):
    __tablename__ = "YourCart"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey("AllPost.id"), nullable=False)

    user = db.relationship("User", backref=db.backref("cart_items", lazy=True))
    post = db.relationship("Post", backref=db.backref("in_carts", lazy=True))

class CheckoutMessage(db.Model):
    __tablename__ = "checkout_messages"
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("AllPost.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    address = db.Column(db.Text, nullable=False)
    message = db.Column(db.Text)
    email = db.Column(db.String(120)) 
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    seen = db.Column(db.Boolean, default=False)
    status = db.Column(db.String(20), nullable=False, default='waiting') # <-- ADDED THIS LINE
    
    post = db.relationship("Post", back_populates="checkout_messages")
    user = db.relationship("User", backref="checkout_messages")

class UserActivity(db.Model):
    __tablename__ = "user_activity"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)

    post_id = db.Column(db.Integer, db.ForeignKey("AllPost.id"), nullable=False)

    action = db.Column(db.String(20), nullable=False)
    # actions: "view", "cart", "search"

    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # relationships (VERY useful later)
    user = db.relationship("User", backref=db.backref("activities", lazy=True))
    post = db.relationship("Post", backref=db.backref("activities", lazy=True))

    def __repr__(self):
        return f"<UserActivity user={self.user_id} post={self.post_id} action={self.action}>"
