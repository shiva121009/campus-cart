"""Insert sample campus marketplace listings (safe to re-run — skips duplicate titles)."""

from datetime import datetime, timedelta
import random

from run import create_app
from app.models import db, Post, User

DUMMY_LISTINGS = [
    {
        "title": "Scientific Calculator (Casio)",
        "description": "Casio fx-991EX class calculator. Used one semester, all keys work. Includes cover.",
        "category": "Stationary",
        "price": 450,
        "image": "Calculator.jpg",
    },
    {
        "title": "Engineering Textbooks Bundle",
        "description": "3 books: Applied Mathematics, DBMS, and OS concepts. Minor highlighting, good for 2nd year.",
        "category": "Stationary",
        "price": 850,
        "image": "books.jpg",
    },
    {
        "title": "Java Programming Textbook",
        "description": "Complete Java reference for campus labs. No torn pages.",
        "category": "Stationary",
        "price": 320,
        "image": "java.jpg",
    },
    {
        "title": "Python Crash Course Book",
        "description": "Beginner-friendly Python book. Ideal for mini projects and viva prep.",
        "category": "Stationary",
        "price": 280,
        "image": "python.jpg",
    },
    {
        "title": "Wireless Headphones",
        "description": "Over-ear headphones with mic. Battery holds ~6 hours. Pickup near boys hostel.",
        "category": "Electronics",
        "price": 1200,
        "image": "headphones.jpg",
    },
    {
        "title": "USB Keyboard",
        "description": "Full-size wired keyboard for desktop setup. Light use in hostel room.",
        "category": "Electronics",
        "price": 350,
        "image": "keyboard.jpg",
    },
    {
        "title": "Gaming Mouse",
        "description": "Ergonomic mouse with adjustable DPI. USB wired, works on Windows/Linux.",
        "category": "Electronics",
        "price": 550,
        "image": "mouse.jpg",
    },
    {
        "title": "Dell Laptop Charger 65W",
        "description": "Original Dell adapter with working cable. Fits most Inspiron models.",
        "category": "Electronics",
        "price": 400,
        "image": "dell_charger.jpg",
    },
    {
        "title": "32GB USB Pendrive",
        "description": "USB 3.0 pendrive for assignments and backups. Formatted and tested.",
        "category": "Electronics",
        "price": 200,
        "image": "pendrive.jpg",
    },
    {
        "title": "Seagate 1TB External HDD",
        "description": "Portable hard drive with cable. ~900GB free. Great for project files and movies.",
        "category": "Electronics",
        "price": 2500,
        "image": "Seagate-1TB-One-Touch-USB-3.2-Gen-1-External-Hard-Drive-Online-Buy-India_01.jpg",
    },
    {
        "title": "Hostel Study Chair",
        "description": "Comfortable plastic study chair. Stackable, easy to move between rooms.",
        "category": "Furniture",
        "price": 1200,
        "image": "study_chair.jpg",
    },
    {
        "title": "Foldable Study Table",
        "description": "Compact table for hostel room. Fits laptop + books. Selling before shifting.",
        "category": "Furniture",
        "price": 1800,
        "image": "hostel-study-table.jpg",
    },
    {
        "title": "Wooden Study Table",
        "description": "Sturdy wooden table with drawer. Minor scratches, fully functional.",
        "category": "Furniture",
        "price": 3200,
        "image": "Wooden-Study-table.jpeg",
    },
    {
        "title": "LED Study Lamp",
        "description": "Adjustable desk lamp, warm white. Perfect for late-night assignments.",
        "category": "Furniture",
        "price": 280,
        "image": "led_study_lamp.jpg",
    },
    {
        "title": "Electric Kettle 1L",
        "description": "Fast-boil kettle for tea and instant noodles. Auto shut-off works.",
        "category": "Others",
        "price": 650,
        "image": "Electric-kettle.jpg",
    },
    {
        "title": "College Uniform Shirt (L)",
        "description": "Official college shirt, size L. Worn twice for events, washed and ironed.",
        "category": "Clothing",
        "price": 350,
        "image": "college-uniform-shirt.jpg",
    },
    {
        "title": "Casual Cotton Shirt",
        "description": "Checked casual shirt, full sleeves. Fits medium build.",
        "category": "Clothing",
        "price": 500,
        "image": "comfortable-good-looking-mens-cotton-checked-casual-shirt-full-hand-427.jpg",
    },
    {
        "title": "Football (Size 5)",
        "description": "Training football, good grip. Used in intramural matches.",
        "category": "Sports",
        "price": 450,
        "image": "football.jpeg",
    },
    {
        "title": "Football Shoes Size 9",
        "description": "Studded shoes for turf. Light wear on soles, includes bag.",
        "category": "Sports",
        "price": 1800,
        "image": "football_Shoes.jpg",
    },
    {
        "title": "5kg Dumbbell Pair",
        "description": "Pair of 5kg dumbbells for hostel workouts. Selling as graduating out.",
        "category": "Sports",
        "price": 900,
        "image": "dumbell.jpg",
    },
    {
        "title": "Badminton Net Set",
        "description": "Portable net with poles for garden/hostel court games. Easy setup.",
        "category": "Sports",
        "price": 750,
        "image": "Portable_Badminton_Net_For_Kids_Families_Garden_Games_Backyard_Games.jpg",
    },
    {
        "title": "Bluetooth Party Speaker",
        "description": "Philips 2.1 speaker with aux and Bluetooth. Loud enough for small gatherings.",
        "category": "Electronics",
        "price": 2200,
        "image": "PHILIPS-TAX570894-400-W-Bluetooth-Party-Speaker-Black-2.1-Channel-1.png",
    },
    {
        "title": "Mini Drafter Set",
        "description": "Engineering drawing kit with scales and compass. Required for workshop courses.",
        "category": "Stationary",
        "price": 400,
        "image": "mini_drafter.jpg",
    },
    {
        "title": "Exercise Resistance Band",
        "description": "Medium resistance band for stretching and physiotherapy exercises.",
        "category": "Sports",
        "price": 250,
        "image": "exercise-band.jpg",
    },
    # --- Extra listings for ML / search / similar-items testing ---
    {
        "title": "Engineering Graph Pad (Pack of 5)",
        "description": "A4 graph sheets for workshop and drawing classes. Unused pack, sealed.",
        "category": "Stationary",
        "price": 120,
        "image": "mini_drafter.jpg",
    },
    {
        "title": "DSA Notes + Question Bank",
        "description": "Handwritten and printed notes for Data Structures. Covers trees, graphs, sorting.",
        "category": "Stationary",
        "price": 150,
        "image": "books.jpg",
    },
    {
        "title": "Wireless Bluetooth Mouse",
        "description": "Silent-click mouse with USB receiver. Good for library and hostel desk.",
        "category": "Electronics",
        "price": 480,
        "image": "mouse.jpg",
    },
    {
        "title": "Laptop Cooling Pad",
        "description": "Dual-fan cooling stand for 15-inch laptops. USB powered, adjustable height.",
        "category": "Electronics",
        "price": 650,
        "image": "keyboard.jpg",
    },
    {
        "title": "20000mAh Power Bank",
        "description": "Fast-charge power bank with Type-C and USB-A. Holds 2–3 phone charges.",
        "category": "Electronics",
        "price": 1100,
        "image": "pendrive.jpg",
    },
    {
        "title": "HDMI Cable 2 Meter",
        "description": "HDMI 2.0 cable for monitor and projector. Tested, no flicker.",
        "category": "Electronics",
        "price": 180,
        "image": "dell_charger.jpg",
    },
    {
        "title": "Mechanical Keyboard (Blue Switch)",
        "description": "RGB backlit mechanical keyboard. Loud clicks — perfect for gaming setup.",
        "category": "Electronics",
        "price": 1450,
        "image": "keyboard.jpg",
    },
    {
        "title": "Laptop Stand Aluminum",
        "description": "Ergonomic stand for MacBook or Windows laptop. Folds flat for backpack.",
        "category": "Electronics",
        "price": 750,
        "image": "hostel-study-table.jpg",
    },
    {
        "title": "Bookshelf for Hostel Room",
        "description": "3-tier metal bookshelf. Easy assembly, fits beside study table.",
        "category": "Furniture",
        "price": 1400,
        "image": "Wooden-Study-table.jpeg",
    },
    {
        "title": "Mattress Topper (Single)",
        "description": "Soft foam topper for hostel bed. Cleaner than hostel mattress alone.",
        "category": "Furniture",
        "price": 900,
        "image": "study_chair.jpg",
    },
    {
        "title": "Winter Hoodie (M)",
        "description": "Navy blue hoodie, size M. Worn lightly, no stains. Good for December exams.",
        "category": "Clothing",
        "price": 600,
        "image": "comfortable-good-looking-mens-cotton-checked-casual-shirt-full-hand-427.jpg",
    },
    {
        "title": "Formal Trousers (32)",
        "description": "Black formal pants for presentations and interviews. Dry-cleaned once.",
        "category": "Clothing",
        "price": 450,
        "image": "college-uniform-shirt.jpg",
    },
    {
        "title": "Cricket Bat (Kashmir Willow)",
        "description": "Lightweight bat for tennis-ball cricket on campus ground. With cover.",
        "category": "Sports",
        "price": 1200,
        "image": "football.jpeg",
    },
    {
        "title": "Yoga Mat 6mm",
        "description": "Non-slip yoga mat for gym and hostel floor workouts. Rolled with strap.",
        "category": "Sports",
        "price": 350,
        "image": "exercise-band.jpg",
    },
    {
        "title": "Running Shoes Size 8",
        "description": "Breathable running shoes, lightly used for morning jogs. Clean soles.",
        "category": "Sports",
        "price": 1600,
        "image": "football_Shoes.jpg",
    },
    {
        "title": "Badminton Rackets (Pair)",
        "description": "Two rackets with 3 shuttlecocks. Good for doubles in sports block.",
        "category": "Sports",
        "price": 950,
        "image": "Portable_Badminton_Net_For_Kids_Families_Garden_Games_Backyard_Games.jpg",
    },
    {
        "title": "Adjustable Dumbbells 10kg",
        "description": "Pair of adjustable dumbbells up to 10kg each. For serious hostel gym.",
        "category": "Sports",
        "price": 2200,
        "image": "dumbell.jpg",
    },
    {
        "title": "Mini Rice Cooker",
        "description": "1.2L rice cooker for hostel cooking. Non-stick pot, works fine.",
        "category": "Others",
        "price": 850,
        "image": "Electric-kettle.jpg",
    },
    {
        "title": "Campus Backpack 40L",
        "description": "Laptop compartment + bottle pockets. Used one year, zips all work.",
        "category": "Others",
        "price": 700,
        "image": "books.jpg",
    },
    {
        "title": "Table Fan 12 inch",
        "description": "Oscillating desk fan for summer hostel room. 3 speed settings.",
        "category": "Others",
        "price": 550,
        "image": "Electric-kettle.jpg",
    },
    {
        "title": "Whiteboard Markers (Set of 8)",
        "description": "Assorted colors for group study and room whiteboard. Most are full.",
        "category": "Stationary",
        "price": 90,
        "image": "mini_drafter.jpg",
    },
    {
        "title": "TI-36 Scientific Calculator",
        "description": "Alternative scientific calculator for engineering labs. Battery included.",
        "category": "Stationary",
        "price": 520,
        "image": "Calculator.jpg",
    },
    {
        "title": "Webcam 1080p",
        "description": "USB webcam with built-in mic for online interviews and viva.",
        "category": "Electronics",
        "price": 980,
        "image": "headphones.jpg",
    },
    {
        "title": "USB-C Hub 7-in-1",
        "description": "Hub with HDMI, USB 3.0, SD card, and PD charging. For thin laptops.",
        "category": "Electronics",
        "price": 890,
        "image": "pendrive.jpg",
    },
]


def seed():
    app = create_app()
    with app.app_context():
        sellers = (
            User.query.filter_by(is_admin=False, verification_status="approved")
            .order_by(User.id)
            .all()
        )
        if not sellers:
            print("No approved student users found. Register students first.")
            return

        existing_titles = {
            t for (t,) in db.session.query(Post.title).all()
        }
        added = 0
        base_time = datetime.utcnow()

        for i, item in enumerate(DUMMY_LISTINGS):
            if item["title"] in existing_titles:
                continue
            seller = sellers[i % len(sellers)]
            post = Post(
                title=item["title"],
                description=item["description"],
                category=item["category"],
                price=item["price"],
                image=item["image"],
                timestamp=base_time - timedelta(hours=random.randint(1, 72 * 14)),
                user_id=seller.id,
                view_count=random.randint(8, 150),
                condition=random.choice(["like_new", "good", "fair"]),
                negotiable=random.choice([True, False, False]),
                pickup_location=random.choice(
                    [
                        "Main gate",
                        "Boys hostel block A",
                        "Girls hostel block B",
                        "Library entrance",
                        "Sports complex",
                    ]
                ),
            )
            db.session.add(post)
            existing_titles.add(item["title"])
            added += 1

        db.session.commit()
        total = Post.query.count()
        print(f"Added {added} dummy listings ({total} total in database).")


if __name__ == "__main__":
    seed()
