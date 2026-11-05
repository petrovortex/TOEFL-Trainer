import type { Item } from './types.ts'
export const writing: Item[] = []
const sentences = [
  [
    'Why was the meeting delayed?',
    'The speaker|was waiting|for|a replacement|microphone',
  ],
  [
    'What did the librarian recommend?',
    'She suggested|that we|reserve|the room|in advance',
  ],
  [
    'Have you seen the new exhibit?',
    'I went|to see it|as soon as|the museum|opened',
  ],
  [
    'Who organized the field trip?',
    'The student|who teaches|the workshop|arranged|the visit',
  ],
  [
    'What happened to the package?',
    'It was|delivered|to the office|before|lunch',
  ],
  [
    'What is your plan for next term?',
    'I hope|to take|a course|that includes|fieldwork',
  ],
  [
    'Why did you choose this route?',
    'It takes|less time|than|the path|through town',
  ],
  [
    'How did your group finish so early?',
    'We had|already collected|the materials|before|the class began',
  ],
  [
    'Do you have the instructions?',
    'The instructions|are inside|the box|that arrived|this morning',
  ],
  [
    'What are the students discussing?',
    'They are comparing|two methods|of measuring|the depth|of a stream',
  ],
  [
    'Did the technician contact you?',
    'She asked|whether|I could|bring the device|on Friday',
  ],
  [
    'What will you do with the notes?',
    'I plan|to organize|them by topic|before|the next lecture',
  ],
  [
    'Would a second trial help?',
    'Another trial|would show|whether|the pattern|is consistent',
  ],
  ['Where did you get this map?', 'A volunteer|gave it|to me|at|the entrance'],
  [
    'Can you explain the schedule?',
    'Each group|will spend|twenty minutes|at|each station',
  ],
  [
    'What surprised you about the talk?',
    'The example|at the end|was more convincing|than|I expected',
  ],
  [
    'Why did the team change rooms?',
    'The room|they booked|was too small|for|the audience',
  ],
  [
    'What did you learn from the test?',
    'The results|suggest|that the surface|affects|the outcome',
  ],
  [
    'Who can collect the forms?',
    'Anyone|with a student card|can collect|a form|at reception',
  ],
  [
    'When should I send my draft?',
    'Please send|your draft|as soon as|you finish|the introduction',
  ],
  [
    'How did you solve the problem?',
    'We checked|each measurement|before|making|a comparison',
  ],
  [
    'Did you hear the announcement?',
    'I missed|the announcement|because|the corridor|was noisy',
  ],
]
for (const [i, [prompt, line]] of sentences.entries())
  writing.push({
    id: 'sentence-' + i,
    task: 'sentence',
    level: 1 + (i % 3),
    title: 'A conversation',
    prompt,
    chunks: line.split('|'),
    keys: [line.replaceAll('|', ' ')],
    evidence: line.replaceAll('|', ' ') + '.',
  })
const scenarios = [
  [
    'Room reservation',
    'the student activities coordinator',
    'Your club booked a room for a workshop, but more students registered than expected.',
    'describe the problem|explain what equipment you need|suggest two possible solutions',
  ],
  [
    'Research appointment',
    'a laboratory supervisor',
    'You will miss a scheduled laboratory orientation because another course has a required field trip.',
    'explain the conflict|request a new appointment|ask how to prepare',
  ],
  [
    'Archive visit',
    'a local archivist',
    'You are researching a neighborhood building and want to consult materials that are available by appointment.',
    'introduce your project|identify the materials you hope to see|offer two possible times',
  ],
  [
    'Borrowed equipment',
    'the media desk',
    'A microphone you borrowed stopped working during a project.',
    'describe what happened|explain the effect on your project|request help meeting the deadline',
  ],
]
for (const [i, [title, to, context, goals]] of scenarios.entries())
  writing.push({
    id: 'email-' + i,
    task: 'email',
    level: 1 + (i % 3),
    title,
    prompt: context + ' Write an email to ' + to + '.',
    passage: goals
      .split('|')
      .map((s) => '• ' + s)
      .join('\n'),
    evidence: 'Address all three requested points using a suitable tone.',
  })
const debates = [
  [
    'Campus space',
    'Should a university use an empty building for quiet study or student events?',
    'A quiet building would help students who share noisy homes.',
    'Events give students a reason to meet people outside their courses.',
  ],
  [
    'Assessment',
    'Should a course grade include a group project?',
    'Group work gives us practice explaining ideas to other people.',
    'It can be difficult to tell how much each person contributed.',
  ],
  [
    'Library hours',
    'Should the library stay open late or open earlier in the morning?',
    'Late hours suit students who work during the day.',
    'An early start can be especially helpful before morning classes.',
  ],
  [
    'Course choice',
    'Should students be required to study a subject outside their main field?',
    'A different subject can change how we approach familiar problems.',
    'Specialists already need considerable time to master their own field.',
  ],
]
for (const [i, [title, q, a, b]] of debates.entries())
  writing.push({
    id: 'discussion-' + i,
    task: 'discussion',
    level: 1 + (i % 3),
    title,
    prompt:
      'Contribute to the discussion. State and support your opinion in your own words.',
    passage: 'Professor: ' + q + '\n\nMira: ' + a + '\n\nLeon: ' + b,
    evidence:
      'Give a relevant contribution and develop it with specific support.',
  })
