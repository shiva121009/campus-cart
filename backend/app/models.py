import json

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
    reset_token = db.Column(db.String(64), nullable=True)
    reset_token_expires = db.Column(db.DateTime, nullable=True)

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
    extra_images = db.Column(db.Text, nullable=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    price = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    condition = db.Column(db.String(20), nullable=False, default="good")
    negotiable = db.Column(db.Boolean, default=False, nullable=False)
    pickup_location = db.Column(db.String(120), nullable=True)
    is_sold = db.Column(db.Boolean, default=False, nullable=False)
    view_count = db.Column(db.Integer, default=0, nullable=False)

    user = db.relationship("User", backref=db.backref("posts", lazy=True))
    checkout_messages = db.relationship(
        "CheckoutMessage", back_populates="post", cascade="all, delete-orphan"
    )

    def get_extra_images(self):
        if not self.extra_images:
            return []
        try:
            data = json.loads(self.extra_images)
            return data if isinstance(data, list) else []
        except (json.JSONDecodeError, TypeError):
            return []

    def set_extra_images(self, filenames):
        self.extra_images = json.dumps(filenames[:4]) if filenames else None


class Wishlist(db.Model):
    __tablename__ = "wishlist"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey("AllPost.id"), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("wishlist_items", lazy=True))
    post = db.relationship("Post", backref=db.backref("wishlisted_by", lazy=True))


class ListingReport(db.Model):
    __tablename__ = "listing_reports"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("AllPost.id"), nullable=False)
    reporter_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="pending")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    post = db.relationship("Post", backref=db.backref("reports", lazy=True))
    reporter = db.relationship("User", backref=db.backref("listing_reports", lazy=True))


class ListingMessage(db.Model):
    __tablename__ = "listing_messages"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey("AllPost.id"), nullable=False)
    sender_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    body = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    read_at = db.Column(db.DateTime, nullable=True)

    post = db.relationship("Post", backref=db.backref("messages", lazy=True))
    sender = db.relationship("User", backref=db.backref("listing_messages_sent", lazy=True))


class SellerRating(db.Model):
    __tablename__ = "seller_ratings"

    id = db.Column(db.Integer, primary_key=True)
    seller_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    buyer_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey("AllPost.id"), nullable=False)
    stars = db.Column(db.Integer, nullable=False)
    comment = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    seller = db.relationship(
        "User", foreign_keys=[seller_id], backref=db.backref("ratings_received", lazy=True)
    )
    buyer = db.relationship(
        "User", foreign_keys=[buyer_id], backref=db.backref("ratings_given", lazy=True)
    )


class SavedSearch(db.Model):
    __tablename__ = "saved_searches"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    query = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(50), nullable=True)
    max_price = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("saved_searches", lazy=True))


class BlockedUser(db.Model):
    __tablename__ = "blocked_users"

    id = db.Column(db.Integer, primary_key=True)
    blocker_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    blocked_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)


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
    status = db.Column(db.String(20), nullable=False, default="waiting")

    post = db.relationship("Post", back_populates="checkout_messages")
    user = db.relationship("User", backref="checkout_messages")


class UserActivity(db.Model):
    __tablename__ = "user_activity"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("Users.id"), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey("AllPost.id"), nullable=False)
    action = db.Column(db.String(20), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User", backref=db.backref("activities", lazy=True))
    post = db.relationship("Post", backref=db.backref("activities", lazy=True))
