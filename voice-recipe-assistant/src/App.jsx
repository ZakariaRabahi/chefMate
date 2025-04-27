import React, { useState, useEffect, useRef } from 'react';
import './App.css';

export default function App() {
  const [listening, setListening] = useState(false);
  const [response, setResponse] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [favorites, setFavorites] = useState([]);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeVoiceCard, setActiveVoiceCard] = useState(null);
  const [modalAssistantActive, setModalAssistantActive] = useState(false);
  const [recipeData, setRecipeData] = useState([]);
  const [recognition, setRecognition] = useState(null);
  const [choiceRecipes, setChoiceRecipes] = useState([]);
  const [showChoices, setShowChoices] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(null);
  const [voices, setVoices] = useState([]);
  const pausedRef = useRef(false);

  useEffect(() => {
    fetch('http://127.0.0.1:5000/recipes')
      .then((res) => res.json())
      .then((data) => setRecipeData(data))
      .catch((err) => console.error('Error fetching recipes:', err));
  }, []);

  useEffect(() => {
    const synth = window.speechSynthesis;
    const loadVoices = () => {
      const voicesList = synth.getVoices();
      if (voicesList.length > 0) {
        setVoices(voicesList);
      }
    };
    loadVoices();
    synth.onvoiceschanged = loadVoices;
  }, []);

  const handleVoiceToggle = () => {
    if (listening) {
      recognition?.stop();
      setListening(false);
    } else {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const newRecognition = new SpeechRecognition();
      newRecognition.lang = 'en-US';
      newRecognition.interimResults = false;
      newRecognition.maxAlternatives = 1;

      newRecognition.start();
      setRecognition(newRecognition);
      setListening(true);

      newRecognition.onresult = async (event) => {
        const speechToText = event.results[0][0].transcript.toLowerCase();
        console.log('You said:', speechToText);

        try {
          const response = await fetch('http://127.0.0.1:5000/speech', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: speechToText,
              selectedRecipeTitle: selectedRecipe ? selectedRecipe.title : null,
            }),
          });
          const data = await response.json();
          console.log('Flask Response:', data);

          if (data.type === 'choices') {
            setChoiceRecipes(data.recipes);
            setShowChoices(true);
            setResponse('Here are some options for you!');
          } else if (data.type === 'text') {
            setResponse(data.response);
          }
        } catch (error) {
          console.error('Error communicating with Flask:', error);
          setResponse('Sorry, something went wrong.');
        }

        const matchedRecipe = recipeData.find((recipe) =>
          recipe.title.toLowerCase().split(' ').some((word) => speechToText.includes(word))
        );

        if (matchedRecipe) {
          console.log('Matched recipe:', matchedRecipe.title);
          setSelectedRecipe(matchedRecipe);
          setActiveVoiceCard(matchedRecipe.title);
          setTimeout(() => setActiveVoiceCard(null), 4000);
        }
      };
    }
  };

  const handleCardVoiceStart = (recipeTitle, inModal = false) => {
    if (!selectedRecipe) return;
  
    if (recognition) recognition.stop();
  
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const synth = window.speechSynthesis;
    const newRecognition = new SpeechRecognition();
    newRecognition.lang = 'en-US';
    newRecognition.interimResults = false;
    newRecognition.continuous = true;
  
    newRecognition.start();
    setRecognition(newRecognition);
    setListening(true);
  
    if (inModal) setModalAssistantActive(true);
  
    let currentStep = 0;
    pausedRef.current = false;
    let awaitingConfirmation = false;
    let timeoutTimer = null;
  
    const resetInactivityTimer = () => {
      if (timeoutTimer) clearTimeout(timeoutTimer);
      timeoutTimer = setTimeout(() => {
        speak("Are you still there? Say resume if you want to continue.");
      }, 180000);
    };
  
    const playDing = () => {
      const audio = new Audio('/ding.mp3');
      audio.volume = 0.1;
      audio.play();
    };
  
    const speak = (text, slow = false) => {
      const voices = synth.getVoices();
      const assistantVoice =
        voices.find(v => v.lang === 'en-US' && v.name.includes('Google')) ||
        voices.find(v => v.lang === 'en-US') ||
        voices[0];
  
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.voice = assistantVoice;
      utterance.rate = slow ? 0.9 : 1;
      synth.cancel();
      synth.speak(utterance);
    };
  
    // ⭐ GREETING at start
    speak(`Hi! I'm ready to help you cook ${recipeTitle}. You can say: next, repeat, ingredients, or ask about a specific ingredient.`);
  
    newRecognition.onresult = (event) => {
      resetInactivityTimer();
  
      const speech = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
      console.log('Heard:', speech);
  
      if (awaitingConfirmation) {
        if (speech.includes('yes')) {
          speak("Okay, ending session. Well done!");
          newRecognition.stop();
          setListening(false);
          setModalAssistantActive(false);
        } else if (speech.includes('no')) {
          speak("No problem! Let's continue cooking.");
          awaitingConfirmation = false;
        }
        return;
      }
  
      if (pausedRef.current && (speech.includes('resume') || speech.includes('continue'))) {
        pausedRef.current = false;
        speak("Resuming. Say next when you're ready.");
        return;
      }
  
      if (!pausedRef.current) {
        if (speech.includes('pause')) {
          pausedRef.current = true;
          speak("Paused. Say resume to continue.");
          return;
        }
  
        if (speech.includes('next') || speech.includes('continue') || speech.includes('go on')) {
          if (currentStep < selectedRecipe.instructions.length) {
            const step = selectedRecipe.instructions[currentStep];
            speak(`Step ${currentStep + 1}: ${step}`, true);
            playDing();
            setCurrentStepIndex(currentStep);
            currentStep++;
          } else {
            speak("You're done! Congratulations!");
            newRecognition.stop();
            setListening(false);
            setModalAssistantActive(false);
          }
        } 
        
        else if (speech.includes('repeat') || speech.includes('again')) {
          if (currentStep > 0) {
            const step = selectedRecipe.instructions[currentStep - 1];
            speak(`Repeating step ${currentStep}: ${step}`, true);
            playDing();
          } else {
            speak("We haven't started yet. Say next to begin.");
          }
        } 
        
        else if (speech.includes('back') || speech.includes('previous')) {
          if (currentStep > 1) {
            currentStep -= 2;
            const step = selectedRecipe.instructions[currentStep];
            speak(`Going back to step ${currentStep + 1}: ${step}`, true);
            setCurrentStepIndex(currentStep);
            playDing();
            currentStep++;
          } else {
            speak("You're already at the beginning.");
          }
        } 
        
        // 🌟 BIG UPDATE: smarter ingredient handling
        else if (
          (speech.includes('ingredient') && (speech.includes('what') || speech.includes('list') || speech.includes('all'))) ||
          (speech.includes('ingredients') && (speech.includes('what') || speech.includes('list') || speech.includes('all'))
        )) {
          // User asked for ALL ingredients
          speak(`Here are all the ingredients you will need: ${selectedRecipe.ingredients.join(', ')}`, true);
        }
        
        else if (speech.includes('ingredient') || speech.includes('how much') || speech.includes('how many') || speech.includes('need')) {
          // User asked for a SPECIFIC ingredient
          let found = null;
          const words = speech.split(' ');
          for (const word of words) {
            found = selectedRecipe.ingredients.find(ing => ing.toLowerCase().includes(word));
            if (found) break;
          }
          if (found) {
            speak(`You need: ${found}.`, true);
          } else {
            speak(`I didn't find that ingredient. You can ask for another one or say 'list all ingredients'.`, true);
          }
        }
        
        else if (speech.includes('where am i') || speech.includes('what step')) {
          if (currentStep > 0) {
            const step = selectedRecipe.instructions[currentStep - 1];
            speak(`You are at step ${currentStep}: ${step}`, true);
          } else {
            speak("We haven't started yet. Say next to begin.");
          }
        }
        
        else if (speech.includes('help')) {
          speak("You can say: next, repeat, back, ingredients, where am I, pause, resume, or finish.");
        }
        
        else if (speech.includes('finish') || speech.includes('stop') || speech.includes('done')) {
          speak("Are you sure you want to stop cooking? Say yes or no.");
          awaitingConfirmation = true;
        }
        
        else {
          speak("Sorry, I didn't catch that. Say next, repeat, back, ingredients, or help.");
        }
      }
    };
  
    newRecognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      newRecognition.stop();
      setListening(false);
      setModalAssistantActive(false);
    };
  };
  

  const toggleFavorite = (title) => {
    setFavorites((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  };

  const isFavorite = (title) => favorites.includes(title);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8">
        <div className="flex items-center mb-4 md:mb-0">
          <div className="bg-indigo-600 text-white p-3 rounded-full mr-4">
            <i className="fas fa-utensils text-2xl"></i>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">ChefMate</h1>
        </div>
        <div className="flex items-center space-x-4">
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center">
            <i className="fas fa-user mr-2"></i>
            <span>Sign In</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col lg:flex-row gap-8">
        {/* Voice Assistant Section */}
        <div className="lg:w-1/3 bg-white rounded-xl shadow-md p-6 flex flex-col">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Voice Assistant</h2>

          <div className="flex flex-col items-center justify-center mb-6">
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full bg-indigo-100 flex items-center justify-center">
                <i className="fas fa-robot text-5xl text-indigo-600"></i>
              </div>
              {listening && (
                <div className="absolute -top-2 -right-2">
                  <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center pulse-animation">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
              )}
            </div>

            {response && (
              <div className="speech-bubble p-4 mb-6 w-full max-w-md fade-in">
                <p className="text-gray-700">{response}</p>
              </div>
            )}

            <button
              id="voice-btn"
              onClick={handleVoiceToggle}
              className="w-20 h-20 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center transition transform hover:scale-105"
            >
              <i className="fas fa-microphone text-2xl"></i>
            </button>
            <p className="text-gray-500 mt-4 text-sm">Press to speak</p>
          </div>

          <div className="bg-gray-100 p-4 rounded-lg">
            <h3 className="font-medium text-gray-700 mb-2">Try saying:</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li><i className="fas fa-chevron-right text-indigo-500 mr-2"></i>"Find me a chicken pasta recipe"</li>
              <li><i className="fas fa-chevron-right text-indigo-500 mr-2"></i>"What can I make with eggs and cheese?"</li>
              <li><i className="fas fa-chevron-right text-indigo-500 mr-2"></i>"Show me vegetarian dinner ideas"</li>
              <li><i className="fas fa-chevron-right text-indigo-500 mr-2"></i>"How do I make chocolate cake?"</li>
            </ul>
          </div>
        </div>

        {/* Recipes Section */}
        <div className="lg:w-2/3">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Recommended Recipes</h2>
            <div className="relative">
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
              <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
            </div>
          </div>

          <div className="flex space-x-4 mb-4">
            <button
              onClick={() => setActiveTab("All")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === "All"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              All Recipes
            </button>
            <button
              onClick={() => setActiveTab("Favorites")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === "Favorites"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
            >
              Favorites
            </button>
          </div>


            
          <div className="flex flex-wrap gap-2 mb-6">
            {["All", "Breakfast", "Lunch", "Dinner", "Vegetarian", "Desserts"].map((label) => (
              <button
                key={label}
                onClick={() => setActiveFilter(label)}
                className={`px-3 py-1 rounded-full text-sm transition ${
                  activeFilter === label
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recipeData
            .filter((recipe) => {
              const matchFilter = activeFilter === "All" || recipe.category === activeFilter;
              const matchesSearch = recipe.title.toLowerCase().includes(searchQuery.toLowerCase());
              const isFav = favorites.includes(recipe.title);
              return (activeTab === "All" ? matchFilter : isFav && matchFilter) && matchesSearch;
            })
            .map((recipe, i) => (
              <div key={i} className="relative group">
                {/* Overlay bubble */}
                {activeVoiceCard === recipe.title && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center z-20 rounded-xl">
                    <div className="bg-white rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 animate-fade-in">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <i className="fas fa-robot text-indigo-600 text-lg"></i>
                      </div>
                      <span className="text-sm text-gray-800 max-w-xs">
                        Let me walk you through {recipe.title}!
                      </span>
                    </div>
                  </div>
                )}

                {/* Recipe Card */}
                <div
                  onClick={() => setSelectedRecipe(recipe)}
                  className={`recipe-card bg-white rounded-xl shadow-md overflow-hidden transition duration-300 cursor-pointer ${activeVoiceCard === recipe.title ? "opacity-70" : ""}`}
                >
                  <img src={recipe.image} alt={recipe.title} className="w-full h-48 object-cover" />
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{recipe.title}</h3>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded ${recipe.category === 'Vegetarian' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {recipe.category}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(recipe.title);
                          }}
                          className="text-xl text-red-500 hover:text-red-600 focus:outline-none"
                          title={isFavorite(recipe.title) ? "Remove from favorites" : "Add to favorites"}
                        >
                          <i className={`fas ${isFavorite(recipe.title) ? 'fa-heart' : 'fa-heart-circle-plus'}`}></i>
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{recipe.description}</p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500"><i className="fas fa-clock mr-1"></i>{recipe.time}</span>
                      <button className="text-indigo-600 hover:text-indigo-800 font-medium">View</button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCardVoiceStart(recipe.title);
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-800 ml-2"
                      >
                        <i className="fas fa-volume-up mr-1"></i> Voice Assist
                      </button>
                    </div>
                  </div>
                </div>
              </div>
          ))}
          </div>
        </div>
      </main>
            {/* Recipe Modal */}
            {selectedRecipe && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-semibold">{selectedRecipe.title}</h3>
              <button onClick={() => setSelectedRecipe(null)} className="text-gray-500 hover:text-gray-700">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-6">
              <img src={selectedRecipe.image} alt={selectedRecipe.title} className="w-full h-64 object-cover rounded-lg mb-4" />
              <div className="flex items-center space-x-4 mb-4 text-gray-600">
                <span><i className="fas fa-clock mr-1"></i>{selectedRecipe.time}</span>
                <span><i className="fas fa-utensils mr-1"></i>{selectedRecipe.servings}</span>
                <span><i className="fas fa-signal mr-1"></i>{selectedRecipe.difficulty}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="md:col-span-1">
                  <h4 className="font-semibold mb-2">Ingredients</h4>
                  <ul className="space-y-2 list-disc list-inside text-sm">
                    {selectedRecipe.ingredients.map((ing, idx) => (
                      <li key={idx}>{ing}</li>
                    ))}
                  </ul>
                </div>
                <div className="md:col-span-2">
                  <h4 className="font-semibold mb-2">Instructions</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm">
                    {selectedRecipe.instructions.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>


              {modalAssistantActive && currentStepIndex !== null && (
                <div className="mt-8 p-6 bg-indigo-100 border-l-4 border-indigo-500 rounded-xl animate-fade-in shadow-lg">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-indigo-200 rounded-full flex items-center justify-center">
                      <i className="fas fa-robot text-indigo-700 text-xl"></i>
                    </div>
                    <h4 className="text-indigo-800 text-lg font-semibold">Cooking Assistant</h4>
                  </div>
                  <div className="text-gray-800 text-base">
                    <p><span className="font-semibold">Step {currentStepIndex + 1}:</span> {selectedRecipe.instructions[currentStepIndex]}</p>
                  </div>
                </div>
              )}


              
              <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => handleCardVoiceStart(selectedRecipe.title, true)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-100 transition"
              >
                <i className="fas fa-volume-up mr-2"></i> Voice Assist
              </button>

                <button
                  onClick={() => toggleFavorite(selectedRecipe.title)}
                  className={`px-4 py-2 rounded-lg transition ${
                    isFavorite(selectedRecipe.title)
                      ? "bg-red-100 text-red-600 hover:bg-red-200"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <i className={`fas ${isFavorite(selectedRecipe.title) ? "fa-heart" : "fa-heart-circle-plus"} mr-2`}></i>
                  {isFavorite(selectedRecipe.title) ? "Favorited" : "Add to Favorites"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showChoices && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Choose a Recipe</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {choiceRecipes.map((recipe, index) => (
            <div
              key={index}
              onClick={() => {
                setSelectedRecipe(recipe);
                setShowChoices(false);
              }}
              className="bg-gray-100 rounded-lg p-4 cursor-pointer hover:bg-gray-200 transition"
            >
              <img src={recipe.image} alt={recipe.title} className="w-full h-40 object-cover rounded-md mb-2" />
              <h3 className="text-lg font-semibold">{recipe.title}</h3>
              <p className="text-sm text-gray-600">{recipe.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)}
    </div> // end of container
  );
}

