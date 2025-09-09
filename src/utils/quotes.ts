export interface Quote {
  q: string;
  a: string;
}

export const QUOTES: Quote[] = [
  { q: "Lost time is never found again.", a: "Benjamin Franklin" },
  { q: "Time is what we want most, but what we use worst.", a: "William Penn" },
  { q: "Better three hours too soon than a minute too late.", a: "Shakespeare" },
  { q: "The future depends on what you do today.", a: "Mahatma Gandhi" },
  { q: "The two most powerful warriors are patience and time.", a: "Leo Tolstoy" },
  { q: "You either die a hero, or you live long enough to see yourself become the villain.", a: "Harvey Dent, The Dark Knight" },
  { q: "Lost time is never found again.", a: "Benjamin Franklin" },
  { q: "Time is what we want most, but what we use worst.", a: "William Penn" },
  { q: "Better three hours too soon than a minute too late.", a: "William Shakespeare" },
  { q: "The future depends on what you do today.", a: "Mahatma Gandhi" },
  { q: "Punctuality is the thief of time.", a: "Oscar Wilde" },
  { q: "Time flies over us, but leaves its shadow behind.", a: "Nathaniel Hawthorne" },
  { q: "The two most powerful warriors are patience and time.", a: "Leo Tolstoy" },
  { q: "They always say time changes things, but you actually have to change them yourself.", a: "Andy Warhol" },
  { q: "Time you enjoy wasting is not wasted time.", a: "Marthe Troly-Curtin" },
  { q: "Men talk of killing time, while time quietly kills them.", a: "Dion Boucicault" },
  { q: "Time is the wisest counselor of all.", a: "Pericles" },
  { q: "The key is in not spending time, but in investing it.", a: "Stephen R. Covey" },
  { q: "Time is free, but it’s priceless.", a: "Harvey Mackay" },
  { q: "Time brings all things to pass.", a: "Aeschylus" },
  { q: "You may delay, but time will not.", a: "Benjamin Franklin" },
  { q: "Yesterday’s the past, tomorrow’s the future, but today is a gift. That’s why it’s called the present.", a: "Bil Keane" },
  { q: "Regret for wasted time is more wasted time.", a: "Mason Cooley" },
  { q: "Time is a created thing. To say 'I don’t have time' is to say 'I don’t want to.'", a: "Lao Tzu" },
  { q: "The common man is not concerned about the passage of time, the man of talent is driven by it.", a: "Arthur Schopenhauer" },
  { q: "An inch of time is an inch of gold, but you can’t buy that inch of time with an inch of gold.", a: "Chinese Proverb" },

  // ——— ORIGINALS (20) ———
  { q: "Time slips away quietly, like sand between fingers.", a: "MeetMate Originals" },
  { q: "Every sunrise is a reminder that time gives us another chance.", a: "MeetMate Originals" },
  { q: "Time is the silent architect of all change.", a: "MeetMate Originals" },
  { q: "Moments are the currency of life—spend them wisely.", a: "MeetMate Originals" },
  { q: "The clock never stops, but you can choose how to dance with it.", a: "MeetMate Originals" },
  { q: "The rarest resource isn’t gold—it’s time.", a: "MeetMate Originals" },
  { q: "Every second you hesitate, a moment becomes memory.", a: "MeetMate Originals" },
  { q: "Time is the soil in which dreams either grow or wither.", a: "MeetMate Originals" },
  { q: "The way you spend your time defines the story of your life.", a: "MeetMate Originals" },
  { q: "There’s no pause button for life’s ticking clock.", a: "MeetMate Originals" },
  { q: "Lost wealth can be rebuilt; lost time is gone forever.", a: "MeetMate Originals" },
  { q: "Every day is a page torn from the book of time.", a: "MeetMate Originals" },
  { q: "Time is the ocean, and we are but waves upon it.", a: "MeetMate Originals" },
  { q: "The clock speaks the same truth to everyone: keep moving.", a: "MeetMate Originals" },
  { q: "Your minutes are seeds; plant them with care.", a: "MeetMate Originals" },
  { q: "Patience is the art of trusting time.", a: "MeetMate Originals" },
  { q: "A wasted hour today is a debt to tomorrow.", a: "MeetMate Originals" },
  { q: "Moments create memories, and memories outlast time.", a: "MeetMate Originals" },
  { q: "The true wealth of life is measured in meaningful hours.", a: "MeetMate Originals" },
  { q: "Don’t count your hours; make your hours count.", a: "MeetMate Originals" },

  // ——— VILLAINS / MOVIES (10) ———
  { q: "The hardest choices require the strongest wills.", a: "Thanos, Avengers: Infinity War" },
  { q: "Introduce a little anarchy. Upset the established order, and everything becomes chaos.", a: "Joker, The Dark Knight" },
  { q: "I find your lack of faith disturbing.", a: "Darth Vader, Star Wars" },
  { q: "The road to power is paved with hypocrisy... and casualties.", a: "Frank Underwood, House of Cards" },
  { q: "If the rule you followed brought you to this, of what use was the rule?", a: "Anton Chigurh, No Country for Old Men" },
  { q: "A man who doesn’t spend time with his family can never be a real man.", a: "Vito Corleone, The Godfather" },
  { q: "The greatest trick the Devil ever pulled was convincing the world he didn’t exist.", a: "Keyser Söze, The Usual Suspects" },
  { q: "You either die a hero, or you live long enough to see yourself become the villain.", a: "Harvey Dent, The Dark Knight" },
  { q: "Fear is the path to the dark side.", a: "Yoda, Star Wars" },
  { q: "Peace is a lie. There is only passion.", a: "Sith Code, Star Wars" }
  // ... add more quotes as needed ...
];

export function getRandomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}


