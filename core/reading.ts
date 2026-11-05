import type { Item } from './types.ts'

export const reading: Item[] = []
const texts = [
  [
    'Keeping a field diary',
    'A field diary preserves the order in which observations were made. Researchers often record small details before they know which ones will matter later. A change in wind direction might appear unimportant until several pages describe insects moving across the same patch of ground. For this reason, many observers write the date and location at the beginning of each entry. The notes become useful to another reader only when that reader can reconstruct the circumstances.',
  ],
  [
    'A clock without a face',
    'Some public clocks once announced the hour only by sound. People working inside nearby buildings could hear the signal without looking toward the tower. The sound served a shared purpose even when individual workers followed different schedules. A clock face added another way to obtain information: someone arriving between signals could check the time immediately. The two forms of communication therefore complemented each other, and many towns kept both.',
  ],
  [
    'How a path takes shape',
    'A narrow path across grass often begins with a single shortcut. Other walkers notice the faint line and follow it because the surface feels easier under their feet. Repeated use gradually removes vegetation and makes the route more visible. A landscape designer can learn from this process by observing where people actually walk before laying permanent paving. However, a popular route may still need to be redirected if it crosses soft ground or damages roots.',
  ],
  [
    'The value of a rough sketch',
    'A sketch drawn during a design meeting can be deliberately unfinished. Its loose lines encourage other participants to suggest changes instead of treating the proposal as settled. Once the team agrees on the general arrangement, a precise drawing becomes more useful. It allows builders to measure distances and check whether separate parts will fit together. The appropriate level of detail thus depends on which decision the drawing is intended to support.',
  ],
  [
    'Layered lake sediments',
    'Fine particles settle slowly on the floor of a quiet lake. These deposits can contain traces of plants that grew around the water at different times. A researcher who removes a narrow column of sediment preserves the order of many layers in one sample. Older material generally lies below younger material, but a storm may disturb that sequence. Interpreting a sample therefore requires attention both to its contents and to evidence that layers have been mixed.',
  ],
  [
    'Sharing a scarce tool',
    'A workshop with only one specialized machine needs a way to allocate time. A reservation system makes access predictable, especially for users traveling from another building. Yet unused reservations can leave the machine idle even when people are waiting nearby. Some workshops therefore release a reserved period if its owner does not arrive within a few minutes. This small rule balances the convenience of planning ahead with the value of keeping shared equipment in use.',
  ],
  [
    'Words for colors',
    'The boundary between two color names is not always sharp. Different speakers may describe the same patch of paint using different words while agreeing that it resembles a particular sample. Researchers sometimes ask participants to sort colored cards before asking them to name the colors. The sorting task reveals which samples people group together. Comparing those groups with the names they choose helps distinguish a difference in vocabulary from a difference in perception.',
  ],
  [
    'A moving audience',
    'Street performers often adjust a performance to suit a changing audience. Someone who stops halfway through a story needs enough context to follow the next part. A singer can repeat a short phrase or a storyteller can reintroduce a character without beginning the entire performance again. Such repetition may seem unnecessary to a listener who has stayed from the start. For a listener who has just arrived, however, it can provide an entry point.',
  ],
]
for (const [i, [title, passage]] of texts.entries()) {
  const parts = passage.split(' '),
    keys: string[] = []
  const start = passage.slice(0, passage.indexOf('.') + 1).split(' ').length
  for (let j = start + 1; j < parts.length && keys.length < 10; j += 2) {
    const word = parts[j].match(/^[a-z]+/i)?.[0]
    if (!word || word.length < 2) continue
    const cut = Math.ceil(word.length / 2)
    keys.push(word.slice(cut))
    parts[j] =
      word.slice(0, cut) +
      '{' +
      (keys.length - 1) +
      '}' +
      parts[j].slice(word.length)
  }
  reading.push({
    id: 'cloze2-' + i,
    task: 'words',
    title,
    prompt: 'Type the missing letters to complete the text.',
    passage: parts.join(' '),
    keys,
    evidence: passage,
    level: 1 + (i % 3),
  })
}

const daily = [
  [
    'Delivery status',
    'Parcel desk • Tracking update\n09:10 — Received at west campus\n11:25 — Attempted delivery, office closed\n13:40 — Held at west campus desk\nThe courier will not make another attempt today. Bring identification to collect the parcel before 17:00. After that time it will be available tomorrow.',
    [
      'Where is the parcel now?|At the west campus desk.|Inside the closed office.|On a second delivery trip.|At the main post office.',
      'What does “attempted delivery” indicate?|The courier reached the destination but could not hand over the parcel.|The recipient collected the parcel.|The office rejected a damaged parcel.|The courier had the wrong address.',
      'What must the recipient do to get the parcel today?|Visit the desk before five with identification.|Wait in the office until five.|Ask for a second delivery.|Register online before noon.',
    ],
  ],
  [
    'Two group tickets',
    'Message from Rosa\nI bought two group tickets for the planetarium: one covers six people, the other covers four. We have nine names so far. Please invite Lee if she wants to come, but do not buy another ticket unless someone else joins after her. Meet at the side entrance because group tickets are checked there.',
    [
      'Why can Lee join without another purchase?|One of the ten places is still available.|She has her own group ticket.|The side entrance is free.|One ticket can be used twice.',
      'Where should group members meet?|At the side entrance.|At the ticket office.|At the main entrance.|Inside the theater.',
      'In what situation would another ticket be needed?|An eleventh person joins.|Lee accepts the invitation.|One person arrives early.|Only nine people attend.',
    ],
  ],
  [
    'Workshop expenses',
    'Expense claim instructions\nKeep your original receipt. Upload a clear photograph with your claim and hold on to the paper copy until the money reaches your account. Meals are covered up to 15 dollars per person. Delivery charges are excluded even when the total is below 15 dollars.',
    [
      'When can the original receipt be discarded?|After reimbursement arrives.|As soon as it is photographed.|When the workshop ends.|Before submitting the claim.',
      'A meal costs 12 dollars plus a 2-dollar delivery charge. How much is eligible?|12 dollars.|14 dollars.|15 dollars.|2 dollars.',
      'What is the purpose of these instructions?|To explain how to claim eligible meal expenses.|To select a workshop restaurant.|To announce a price increase.|To order meals for visitors.',
    ],
  ],
  [
    'A rehearsal change',
    'Kai: Did rehearsal move to Thursday?\nAri: Only the costume fitting did. Rehearsal is still Wednesday, but we have the small hall. Bring the folding screen instead of the painted backdrop; the backdrop will not fit through the door.\nKai: Got it. I will leave the backdrop in storage.',
    [
      'Which event takes place on Thursday?|The costume fitting.|The regular rehearsal.|A backdrop delivery.|A performance.',
      'Why is a folding screen needed?|The backdrop cannot pass through the entrance.|The screen has already been painted.|The storage room is closed.|The fitting requires privacy.',
      'What misunderstanding does Ari correct?|Kai thought the rehearsal date had changed.|Kai thought the costumes were ready.|Kai thought the small hall was unavailable.|Kai thought the screen had been lost.',
    ],
  ],
  [
    'Room bookings',
    'Room search results • Wednesday, 14:00–15:00\nOak: 8 seats, projector, booked.\nElm: 12 seats, whiteboard, available.\nPine: 6 seats, projector, available.\nGroups may borrow a portable projector from reception. Reserve the room first; reception needs the booking number.',
    [
      'Which available room fits a group of nine?|Elm.|Pine.|Oak.|Both Pine and Oak.',
      'What is needed to reserve the portable projector?|A room booking number.|An equipment receipt.|A list of attendees.|A whiteboard key.',
      'Why might a group of five choose Pine?|It already has a projector.|It has more seats than Elm.|It is booked for the whole day.|It is next to reception.',
    ],
  ],
  [
    'A photograph credit',
    'From: Campus editor\nThank you for the photograph of the old fountain. We can use it in Friday’s issue if you send the photographer’s name by noon on Thursday. A caption is already written. If the name arrives later, we will keep the picture for our website rather than delay printing.',
    [
      'What is the editor waiting for?|The photographer’s name.|A new caption.|A clearer photograph.|Permission to repair the fountain.',
      'What will happen if the information arrives Thursday evening?|The picture can be used online.|The printed issue will be delayed.|The caption will be removed.|The photograph must be retaken.',
      'Why does the editor mention the caption?|To clarify that this part is already complete.|To ask for a translation.|To explain the condition of the fountain.|To suggest changing the credit.',
    ],
  ],
  [
    'Library survey',
    'Quick poll • Study room lighting\nWhich change would help you most? Select ONE option: brighter desk lamps / softer overhead lights / no change. The poll closes on Monday. Maintenance requests, including broken switches, should go to the service desk. Poll responses are anonymous, so staff cannot follow up on individual faults here.',
    [
      'Where should a student report a broken switch?|At the service desk.|In the anonymous poll.|Beside the desk lamps.|At the Monday meeting.',
      'Why does the poll ask for one option?|To identify the change each person values most.|To limit the number of participants.|To guarantee that all lamps are replaced.|To assign repair times.',
      'Why can staff not respond to a fault reported in the poll?|They cannot identify the respondent.|The poll is already closed.|The service desk handles only new lamps.|Only staff can vote.',
    ],
  ],
] as const
for (const [i, [title, passage, quiz]] of daily.entries())
  for (const [j, line] of quiz.entries()) {
    const [prompt, ...options] = line.split('|')
    reading.push({
      id: 'daily2-' + i + '-' + j,
      group: 'daily2-' + i,
      task: 'daily',
      title,
      passage,
      prompt,
      options,
      keys: [options[0]],
      evidence: passage,
      level: 1 + (i % 3),
    })
  }
