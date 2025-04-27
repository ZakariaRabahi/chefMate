from flask import Flask, render_template, redirect, url_for, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

app.config['SECRET_KEY'] = 'your_secret_key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
db = SQLAlchemy(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

# Models
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username, password=password).first()
        if user:
            login_user(user)
            return redirect(url_for('welcome'))
    return render_template('login.html')

@app.route('/home')
@login_required
def welcome():
    return render_template('home.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

# Recipe Data
recipes = [
    {
        "title": "Avocado Toast",
        "image": "https://images.unsplash.com/photo-1628556820645-63ba5f90e6a2?q=80&w=1964&auto=format&fit=crop",
        "category": "Vegetarian",
        "time": "10 min",
        "description": "A simple yet delicious breakfast with creamy avocado on toasted bread.",
        "servings": "1 serving",
        "difficulty": "Easy",
        "ingredients": [
            "2 slices of whole grain bread",
            "1 ripe avocado",
            "1/2 lemon, juiced",
            "Salt and pepper to taste",
            "Red pepper flakes (optional)",
            "2 eggs (optional)",
            "Microgreens for garnish (optional)"
        ],
        "instructions": [
            "Toast the bread until golden and crisp.",
            "Cut and mash the avocado with lemon juice, salt, and pepper.",
            "Spread mixture, top with egg and garnish as desired."
        ]
    },
    {
        "title": "Fresh Vegetable Salad",
        "image": "https://images.unsplash.com/photo-1738486511470-471be341a1e3?q=80&w=1935&auto=format&fit=crop",
        "category": "Lunch",
        "time": "15 min",
        "description": "A refreshing mix of seasonal vegetables with a light vinaigrette.",
        "servings": "2 servings",
        "difficulty": "Easy",
        "ingredients": [
            "Mixed salad greens",
            "Cucumber, cherry tomatoes",
            "Red onion, bell pepper",
            "Feta cheese, olive oil, balsamic vinegar",
            "Honey, salt, pepper"
        ],
        "instructions": [
            "Chop vegetables, whisk dressing ingredients.",
            "Toss salad and top with feta."
        ]
    },
    {
        "title": "Spaghetti Carbonara",
        "image": "https://images.unsplash.com/photo-1608756687911-aa1599ab3bd9?q=80&w=1974&auto=format&fit=crop",
        "category": "Dinner",
        "time": "25 min",
        "description": "Classic pasta with eggs, cheese, pancetta, and pepper.",
        "servings": "2 servings",
        "difficulty": "Medium",
        "ingredients": [
            "Spaghetti",
            "2 eggs, grated parmesan",
            "Pancetta or bacon",
            "Black pepper, salt"
        ],
        "instructions": [
            "Cook pasta. Fry pancetta. Mix eggs and cheese.",
            "Toss pasta with pancetta and egg mix (off heat).",
            "Season and serve immediately."
        ]
    },
    {
        "title": "Homemade Pizza",
        "image": "https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=2070&auto=format&fit=crop",
        "category": "Lunch",
        "time": "1 hr",
        "description": "Make your own pizza with your favorite toppings and fresh dough.",
        "servings": "4 servings",
        "difficulty": "Hard",
        "ingredients": [
            "Pizza dough",
            "Tomato sauce",
            "Mozzarella cheese",
            "Toppings of choice (pepperoni, veggies, etc.)"
        ],
        "instructions": [
            "Preheat oven. Roll out dough.",
            "Spread sauce, add cheese and toppings.",
            "Bake until golden brown."
        ]
    },
    {
        "title": "Banana Pancakes",
        "image": "https://images.unsplash.com/photo-1606149186228-4e5ac94a742e?q=80&w=2070&auto=format&fit=crop",
        "category": "Breakfast",
        "time": "20 min",
        "description": "Fluffy pancakes with a hint of banana sweetness.",
        "servings": "3 servings",
        "difficulty": "Easy",
        "ingredients": [
            "2 ripe bananas",
            "1 cup flour",
            "1 egg, 1 cup milk",
            "1 tsp baking powder, pinch of salt"
        ],
        "instructions": [
            "Mash bananas. Mix all ingredients into batter.",
            "Cook on greased pan until golden.",
            "Serve with syrup or berries."
        ]
    },
    {
        "title": "Vegan Buddha Bowl",
        "image": "https://plus.unsplash.com/premium_photo-1664648005742-0c360f4910b2?q=80&w=2070&auto=format&fit=crop",
        "category": "Vegetarian",
        "time": "30 min",
        "description": "A nourishing bowl with grains, veggies, and tahini dressing.",
        "servings": "2 bowls",
        "difficulty": "Medium",
        "ingredients": [
            "Cooked quinoa or brown rice",
            "Roasted sweet potatoes, chickpeas",
            "Avocado, cucumber, red cabbage",
            "Tahini, lemon, garlic"
        ],
        "instructions": [
            "Roast veggies and chickpeas.",
            "Assemble bowl with base, toppings, and drizzle dressing."
        ]
    },
    {
    "title": "Caprese Salad",
    "image": "https://images.unsplash.com/photo-1595587870672-c79b47875c6a?q=80&w=1946&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    "category": "Lunch",
    "time": "10 min",
    "description": "A fresh Italian salad with mozzarella, tomatoes, and basil.",
    "servings": "2 servings",
    "difficulty": "Easy",
    "ingredients": [
        "Fresh mozzarella",
        "Tomatoes",
        "Fresh basil leaves",
        "Olive oil",
        "Balsamic glaze",
        "Salt and pepper"
    ],
    "instructions": [
        "Slice mozzarella and tomatoes.",
        "Layer them alternately with basil leaves.",
        "Drizzle olive oil and balsamic glaze.",
        "Season with salt and pepper."
    ]
    },
    {
        "title": "Classic Beef Burger",
        "image": "https://images.unsplash.com/photo-1550547660-d9450f859349?q=80&w=2070&auto=format&fit=crop",
        "category": "Dinner",
        "time": "30 min",
        "description": "Juicy homemade beef burgers perfect for any occasion.",
        "servings": "2 servings",
        "difficulty": "Medium",
        "ingredients": [
            "400g ground beef",
            "Burger buns",
            "Cheddar cheese slices",
            "Lettuce, tomato, onion",
            "Ketchup, mustard",
            "Salt and pepper"
        ],
        "instructions": [
            "Season ground beef and form patties.",
            "Grill patties until cooked.",
            "Toast buns lightly.",
            "Assemble burgers with toppings and sauces."
        ]
    },
    {
        "title": "Berry Smoothie Bowl",
        "image": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?q=80&w=1972&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "category": "Breakfast",
        "time": "10 min",
        "description": "A colorful and nutritious berry smoothie bowl to start your day.",
        "servings": "1 serving",
        "difficulty": "Easy",
        "ingredients": [
            "1 cup frozen mixed berries",
            "1 banana",
            "1/2 cup almond milk",
            "Granola",
            "Chia seeds",
            "Fresh berries for topping"
        ],
        "instructions": [
            "Blend frozen berries, banana, and almond milk until smooth.",
            "Pour into a bowl.",
            "Top with granola, chia seeds, and fresh berries."
        ]
    },
    {
        "title": "Shrimp Tacos",
        "image": "https://images.unsplash.com/photo-1611250188496-e966043a0629?q=80&w=1925&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "category": "Dinner",
        "time": "25 min",
        "description": "Flavorful shrimp tacos with fresh toppings and spicy sauce.",
        "servings": "3 servings",
        "difficulty": "Medium",
        "ingredients": [
            "Shrimp (peeled and deveined)",
            "Taco shells",
            "Cabbage slaw",
            "Avocado",
            "Lime",
            "Spicy mayo",
            "Cilantro"
        ],
        "instructions": [
            "Season and cook shrimp.",
            "Prepare cabbage slaw and slice avocado.",
            "Fill taco shells with shrimp, slaw, avocado, and drizzle spicy mayo.",
            "Garnish with cilantro and lime."
        ]
    },
    {
        "title": "Chocolate Chip Cookies",
        "image": "https://plus.unsplash.com/premium_photo-1670895801135-858a7d167ea4?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
        "category": "Desserts",
        "time": "20 min",
        "description": "Crispy on the edges, chewy in the center—classic chocolate chip cookies.",
        "servings": "24 cookies",
        "difficulty": "Easy",
        "ingredients": [
            "2 1/4 cups flour",
            "1 tsp baking soda",
            "1 tsp salt",
            "1 cup butter, softened",
            "3/4 cup sugar",
            "3/4 cup brown sugar",
            "2 eggs",
            "2 tsp vanilla extract",
            "2 cups chocolate chips"
        ],
        "instructions": [
            "Preheat oven to 375°F (190°C).",
            "Mix dry ingredients separately.",
            "Cream butter and sugars, then add eggs and vanilla.",
            "Combine dry and wet mixtures, fold in chocolate chips.",
            "Drop spoonfuls onto baking sheet and bake 9–11 minutes."
        ]
    }
]


@app.route('/recipes', methods=['GET'])
def get_all_recipes():
    return jsonify(recipes)


app.secret_key = 'your_secret_key'  # Needed for session

@app.route('/speech', methods=['POST'])
def handle_speech():
    data = request.get_json()
    user_query = data.get('query', '').lower()
    selected_recipe_title = data.get('selectedRecipeTitle')

    if not user_query:
        return jsonify({'type': 'text', 'response': "Sorry, I didn't catch that. Can you repeat?"})

    # If a recipe is selected, guide through it
    if selected_recipe_title:
        recipe = next((r for r in recipes if r['title'] == selected_recipe_title), None)
        if not recipe:
            return jsonify({'type': 'text', 'response': "I couldn't find the selected recipe. Please try again."})

        if 'stepIndex' not in session:
            session['stepIndex'] = 0

        ingredients = recipe['ingredients']
        instructions = recipe['instructions']
        time = recipe['time']
        servings = recipe['servings']
        difficulty = recipe['difficulty']

        # Specific queries
        if "ingredient" in user_query or "what do i need" in user_query:
            ingredients_text = ", ".join(ingredients)
            return jsonify({'type': 'text', 'response': f"You will need: {ingredients_text}."})

        elif "first step" in user_query or "start" in user_query or "begin" in user_query:
            session['stepIndex'] = 0
            return jsonify({'type': 'text', 'response': f"First step: {instructions[0]}"})

        elif "next" in user_query or "what's next" in user_query:
            session['stepIndex'] += 1
            if session['stepIndex'] >= len(instructions):
                session['stepIndex'] = len(instructions) - 1
                return jsonify({'type': 'text', 'response': "You have completed all steps! Congratulations!"})
            return jsonify({'type': 'text', 'response': f"Next step: {instructions[session['stepIndex']]}."})

        elif "repeat" in user_query or "again" in user_query:
            return jsonify({'type': 'text', 'response': f"Repeating: {instructions[session['stepIndex']]}."})

        elif "time" in user_query or "how long" in user_query:
            return jsonify({'type': 'text', 'response': f"This recipe takes approximately {time}."})

        elif "serving" in user_query or "how many people" in user_query:
            return jsonify({'type': 'text', 'response': f"This recipe makes {servings}."})

        elif "difficulty" in user_query or "hard" in user_query or "easy" in user_query:
            return jsonify({'type': 'text', 'response': f"The difficulty level is {difficulty}."})

        else:
            return jsonify({'type': 'text', 'response': "I'm here! You can ask about ingredients, steps, time, servings, or difficulty."})

    # --- ✨ If no recipe is selected, detect category recommendation ---
    keywords_mapping = {
        "vegan": ["vegan", "plant-based"],
        "vegetarian": ["vegetarian", "veggie", "meatless"],
        "breakfast": ["breakfast", "morning"],
        "lunch": ["lunch", "light meal"],
        "dinner": ["dinner", "evening meal"],
        "desserts": ["dessert", "sweet", "sweets"],
        "healthy": ["healthy", "light"],
        "quick": ["quick", "fast", "easy"],
    }

    matched_category = None
    for category, keywords in keywords_mapping.items():
        for keyword in keywords:
            if keyword in user_query:
                matched_category = category
                break
        if matched_category:
            break

    if matched_category:
        matched_recipes = []
        for recipe in recipes:
            if matched_category == "healthy":
                if recipe["difficulty"].lower() == "easy":
                    matched_recipes.append(recipe)
            elif matched_category == "quick":
                if "min" in recipe["time"].lower() or "20" in recipe["time"]:
                    matched_recipes.append(recipe)
            elif matched_category in recipe["category"].lower():
                matched_recipes.append(recipe)
            elif matched_category in recipe["title"].lower():
                matched_recipes.append(recipe)

        if matched_recipes:
            return jsonify({'type': 'choices', 'recipes': matched_recipes[:5]})  # Limit to 5
        else:
            return jsonify({'type': 'text', 'response': f"Sorry, I couldn't find {matched_category} recipes."})

    # fallback search (by title or category match)
    wanted_keywords = []
    all_titles = [r['title'].lower() for r in recipes]
    for recipe in recipes:
        if any(word in user_query for word in recipe['title'].lower().split() + recipe['category'].lower().split()):
            wanted_keywords.append(recipe)

    if wanted_keywords:
        return jsonify({'type': 'choices', 'recipes': wanted_keywords[:5]})

    return jsonify({'type': 'text', 'response': "Sorry, I couldn't find a matching recipe. Try asking differently?"})



# Run the server
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)
