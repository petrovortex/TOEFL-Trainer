import type { Item } from './types.ts'
const tours = [
  [
    'The lending library',
    'Welcome to the lending desk.',
    'Please show your campus card.',
    'Return small tools to the blue cabinet.',
    'If the desk is closed, use the box outside.',
    'Larger equipment must be returned during opening hours.',
    'Before you leave, check that all the pieces are in the case.',
    'Anyone who needs an extension should contact the desk before the original return date.',
  ],
  [
    'The greenhouse',
    'Welcome to our greenhouse.',
    'Leave your bag beside the entrance.',
    'Follow the narrow path between the benches.',
    'These young plants need protection from direct sunlight.',
    'Please close both doors before you enter the growing area.',
    'If the temperature rises, the roof panels will open automatically.',
    'The plants with purple labels belong to a research project that continues through the winter.',
  ],
  [
    'The sound studio',
    'This room is for recording.',
    'Hang your coat by the door.',
    'Keep the red light on during your session.',
    'The microphone stand can be adjusted with one hand.',
    'Use the headphones to check the level before you speak.',
    'To avoid recording unwanted noise, switch off the fan near the window.',
    'When your session is over, save a copy of the recording before closing the program.',
  ],
  [
    'A volunteer orientation',
    'Thank you for volunteering.',
    'Sign your name on this sheet.',
    'The collection tables are just past the stairs.',
    'Each family can choose three books to take home.',
    'You can use a yellow sticker to mark books with missing pages.',
    'At the end of each shift, count the books on your table.',
    'If a visitor wants to donate more books, direct them to the collection point near the entrance.',
  ],
]
const interviews = [
  [
    'Learning with others',
    'Tell me about a time you learned something from a classmate. What did you learn?',
    'Do you prefer to study in a quiet room or with other people nearby? Why?',
    'What makes a study group effective? Give an example.',
    'Should universities assign study partners to all new students? Explain your reasoning.',
  ],
  [
    'Public spaces',
    'Describe an outdoor space you use regularly. What takes you there?',
    'What change would make that place more useful to you?',
    'Some people want more sports areas, while others want quiet gardens. Which would you prioritize?',
    'Who should decide how a shared public space is used? Explain.',
  ],
  [
    'Everyday technology',
    'Tell me about a tool that helps you organize your week.',
    'How did you learn to use it? What was difficult at first?',
    'Would you recommend the same tool to every student? Why?',
    'Should a college require students to use one scheduling system? Explain.',
  ],
  [
    'Trying a new activity',
    'Describe an activity you tried for the first time recently.',
    'What helped you keep going when it felt unfamiliar?',
    'Is it easier to develop a skill alone or with a teacher? Give a reason.',
    'Should universities require students to take a course outside their field? Why?',
  ],
]
export const speaking: Item[] = [
  ...tours.flatMap(([title, ...lines], g) =>
    lines.map((speech, i): Item => ({
      id: 'repeat-' + g + '-' + i,
      task: 'repeat',
      title,
      speech,
      group: 'tour-' + g,
      level: Math.min(3, 1 + Math.floor(i / 3)),
      prompt: 'Listen to the speaker. Then repeat the sentence once.',
    })),
  ),
  ...interviews.flatMap(([title, ...lines], g) =>
    lines.map((speech, i): Item => ({
      id: 'interview-' + g + '-' + i,
      task: 'interview',
      title,
      speech,
      group: 'interview-' + g,
      level: i < 2 ? 2 : 3,
      prompt:
        'Listen to the interviewer. Give a clear answer with a reason or example.',
    })),
  ),
]
