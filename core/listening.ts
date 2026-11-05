import type { Item, Task } from './types.ts'
export const listening: Item[] = []
const replies = [
  ['The copier is flashing again.', 'I can show you where the paper goes.'],
  [
    'Would you mind saving me a seat?',
    'Sure. I will put my bag on the chair beside me.',
  ],
  [
    'How did your rehearsal go?',
    'Better this time. We finished the whole piece.',
  ],
  ['I thought the library closed at six.', 'It stays open later during exams.'],
  ['Who has the key to this cabinet?', 'The lab assistant usually keeps it.'],
  ['Why did you leave the talk early?', 'I had to catch the last bus.'],
  [
    'Are you taking the stairs or the lift?',
    'The stairs. My class is only one floor up.',
  ],
  [
    'Did you manage to print the handout?',
    'Only the first page. The machine ran out of ink.',
  ],
  [
    'When should we return the borrowed equipment?',
    'Before the desk closes on Friday.',
  ],
  [
    'Could I borrow your notes from Monday?',
    'Of course. I will bring them tomorrow.',
  ],
  ['The projector looks out of focus.', 'Try turning the ring on the lens.'],
  [
    'Is the field trip still going ahead?',
    'Yes, though we are leaving an hour later.',
  ],
  [
    'What did you think of the new exhibition?',
    'The maps were the part I liked most.',
  ],
  [
    'Would Tuesday work for our next meeting?',
    'I have a lab then. How about Wednesday?',
  ],
  [
    'Where can I leave this package?',
    'There is a shelf behind the reception desk.',
  ],
  [
    'Has the room reservation been confirmed?',
    'I just received the confirmation message.',
  ],
  ['Why not walk to the station together?', 'Good idea. Let me get my coat.'],
  [
    'Do you know how the waiting list works?',
    'They contact the first person whenever a place opens.',
  ],
  [
    'You look like you could use a break.',
    'I could. I have been reading all morning.',
  ],
  [
    'Which draft should I send to the editor?',
    'Use the one with the revised introduction.',
  ],
  [
    'Do we need exact change for the lockers?',
    'No, they take campus cards now.',
  ],
  [
    'Did anyone find a scarf after class?',
    'There is one on the hook near the board.',
  ],
  [
    'I can hardly hear the speaker from here.',
    'There are empty seats near the front.',
  ],
  [
    'How far along are you with the model?',
    'The frame is finished, but the roof still needs work.',
  ],
  [
    'Is it too late to join the walking group?',
    'They are still accepting members this week.',
  ],
  ['Who is bringing the spare batteries?', 'Mina offered to pick them up.'],
  [
    'Would you rather give the introduction or the conclusion?',
    'The introduction. I know the background well.',
  ],
  [
    'Are both entrances open today?',
    'Only the east entrance while repairs continue.',
  ],
  [
    'What do you make of this graph?',
    'The rise in the last two months is striking.',
  ],
  [
    'Can you carry this box down the hall?',
    'Yes. Let me put these books down first.',
  ],
]
const distractors = [
  [
    'The copies were due last term.',
    'It is a photograph of a light.',
    'The price is per sheet.',
  ],
  [
    'My ticket was printed yesterday.',
    'The meeting lasted an hour.',
    'There were two seats on the invoice.',
  ],
  [
    'We rehearse on the third floor.',
    'The concert is next Thursday.',
    'A rehearsal is listed on the calendar.',
  ],
  [
    'Six books fit on each shelf.',
    'The clock was a gift to the library.',
    'The library opened in the last century.',
  ],
  [
    'It is the cabinet beside the sink.',
    'The key has a round handle.',
    'The cabinet was installed last winter.',
  ],
  [
    'The talk started at nine.',
    'The speaker left through the front door.',
    'The early session is on the schedule.',
  ],
  [
    'The floor was repaired last month.',
    'The stairwell has two windows.',
    'The lift inspection took an hour.',
  ],
  [
    'The handout is about soil samples.',
    'Printing costs are listed by color.',
    'The lecture ended after lunch.',
  ],
  [
    'The camera is the smaller item.',
    'The loan form was printed in blue.',
    'The case has two handles.',
  ],
  [
    'Monday was the first day of term.',
    'The notebook has a green cover.',
    'The notes are arranged by subject.',
  ],
  [
    'The film was about a photographer.',
    'The room was booked under my name.',
    'The lecture slides are numbered.',
  ],
  [
    'The last trip was to a river.',
    'The field notes have been typed.',
    'The guidebook is on my desk.',
  ],
  [
    'The exhibition opens at noon.',
    'The tickets have a map on the back.',
    'The gallery is on the first floor.',
  ],
  [
    'Tuesday is printed at the top of the form.',
    'The meeting room has twelve chairs.',
    'The previous meeting lasted an hour.',
  ],
  [
    'It weighs about two kilograms.',
    'I think the package arrived yesterday.',
    'The label is written in blue ink.',
  ],
  [
    'The room has a large window.',
    'A reservation normally needs a date.',
    'The chairs were replaced last month.',
  ],
  [
    'The station opened many years ago.',
    'My return ticket has two parts.',
    'The station clock is above the entrance.',
  ],
  [
    'The list is written in black ink.',
    'Waiting outside would be uncomfortable.',
    'The course meets in the west wing.',
  ],
  [
    'The broken cup is in the bin.',
    'The break in the line is marked in red.',
    'The first chapter has six pages.',
  ],
  [
    'The editor works downtown.',
    'The deadline is on the calendar.',
    'Both files have the same size.',
  ],
  [
    'The lockers are beside the stairs.',
    'The key is smaller than a coin.',
    'The lock was replaced yesterday.',
  ],
  [
    'The scarf was made of wool.',
    'Our next class meets at ten.',
    'The coat hooks were installed on Monday.',
  ],
  [
    'The speaker teaches on Fridays.',
    'The hall was painted last year.',
    'The program lists three speakers.',
  ],
  [
    'The model is made of cardboard.',
    'The model is on the second shelf.',
    'The assignment was announced last week.',
  ],
  [
    'The walk is five kilometers long.',
    'They wear bright jackets.',
    'The path goes around the lake.',
  ],
  [
    'The batteries last several hours.',
    'There are four batteries in the pack.',
    'The charger is in the cupboard.',
  ],
  [
    'The whole talk is ten minutes long.',
    'The title is written on the first slide.',
    'The audience will sit in a circle.',
  ],
  [
    'Both doors were painted blue.',
    'The east entrance has a sign.',
    'The building opened in September.',
  ],
  [
    'The paper is printed on one side.',
    'The graph was drawn in black ink.',
    'The report is on the desk.',
  ],
  [
    'The box was delivered last week.',
    'The hall has a high ceiling.',
    'The label is on the other side.',
  ],
]
for (const [i, [speech, key]] of replies.entries()) {
  const options = [key, ...distractors[i]]
  listening.push({
    id: 'reply-' + i,
    task: 'reply',
    level: 1 + (i % 3),
    title: 'A campus exchange',
    speech,
    prompt: 'Choose the most appropriate response.',
    options,
    keys: [key],
    evidence: 'The speaker says: “' + speech + '”',
  })
}
function group(
  task: Task,
  i: number,
  title: string,
  speech: string,
  questions: string[][],
) {
  for (const [j, [prompt, ...options]] of questions.entries())
    listening.push({
      id: task + '-' + i + '-' + j,
      group: task + '-' + i,
      task,
      level: 1 + (i % 3),
      title,
      speech,
      prompt,
      options,
      keys: [options[0]],
      evidence: speech,
    })
}
function scene(
  task: 'conversation' | 'announcement' | 'talk',
  tag: number,
  title: string,
  lines: string[],
  quiz: string[],
) {
  group(
    task,
    tag,
    title,
    lines.join('\n'),
    quiz.map((line) => line.split('|')),
  )
}
scene(
  'conversation',
  0,
  'A map with no date',
  [
    'The catalogue calls this map undated. But look at the bridge drawn in the corner.',
    'Oh, the footbridge! That was built after the flood. So the map must be younger than we thought.',
    'Unless the bridge was added later. The ink looks darker there.',
    'Good catch. I will ask the archivist to examine the original before I change the label.',
  ],
  [
    'What initially suggests a later date for the map?|A structure shown on it was built after a known event.|A label has a recent date.|The map depicts flood damage.|The paper came from a new supplier.',
    'Why does the second speaker postpone changing the label?|The bridge may have been drawn onto an older map.|The archivist has already changed it.|The flood date is uncertain.|The original is unavailable.',
  ],
)
scene(
  'conversation',
  1,
  'Two rehearsals',
  [
    'Our rehearsal overlaps with the choir again. Last time the brass drowned out their quiet passage.',
    'Could we swap rooms?',
    'Both rooms share the same thin wall. What if we rehearse the opening first, while they are warming up?',
    'That leaves our loud ending for later, after they leave. I will change the order on the board.',
  ],
  [
    'Why would exchanging rooms fail to solve the problem?|The sound travels through a shared wall.|One room lacks a board.|The choir needs a larger room.|The loud passage comes first.',
    'What will change at the rehearsal?|The order of the pieces.|The start time for the choir.|The length of the ending.|The room assigned to each group.',
  ],
)
scene(
  'conversation',
  2,
  'An almost empty bus',
  [
    'I counted only three passengers on the late bus. Maybe nobody needs it.',
    'I used to take it only on nights when my lab ran over. Knowing it was there let me enroll in the course.',
    'So a count on one night misses something.',
    'Exactly. Ask students what they would have to change if the service disappeared.',
  ],
  [
    'What does the second speaker illustrate with the lab example?|A service can affect decisions even when it is rarely used.|Labs regularly finish before the last bus.|Most bus riders study science.|Students prefer courses at night.',
    'What information do the speakers still need?|How students would adapt without the bus.|How many stops the bus makes.|Whether labs are compulsory.|What the fare used to be.',
  ],
)
scene(
  'conversation',
  3,
  'Printing a photograph',
  [
    'My print looks darker than the photograph on my screen. Should I brighten the file?',
    'Before you edit it, hold this reference print next to your screen. Does that look dark too?',
    'Yes, and I know the reference print is right.',
    'Then try lowering the brightness of your screen until the two match. The file may be fine.',
  ],
  [
    'Why does the technician offer a reference print?|To isolate the source of the difference.|To demonstrate a different camera.|To replace the student’s photograph.|To show what happens with thicker paper.',
    'Which action does the technician suggest first?|Adjusting the display.|Editing the image file.|Cleaning the printer.|Taking the photograph again.',
  ],
)
scene(
  'conversation',
  4,
  'Missing survey cards',
  [
    'We handed out forty survey cards and got thirty back. I wrote that three quarters of the visitors liked the exhibit.',
    'Wait. Is that the number who liked it or the number who replied?',
    'Oh. I still have to read what they wrote.',
    'Right. And keep those ten missing cards separate. We do not know what those visitors thought.',
  ],
  [
    'What did the first speaker confuse?|The response rate and the approval rate.|The number of exhibits and visitors.|Visitors who arrived and visitors who left.|Written and spoken comments.',
    'What can the speakers conclude about the ten visitors?|Their opinions remain unknown.|They disliked the exhibit.|They arrived after the survey.|They forgot to visit the exhibit.',
  ],
)
scene(
  'conversation',
  5,
  'A change of partner',
  [
    'I noticed you signed up for the river survey twice.',
    'Once as a driver and once as a sampler. I thought those were separate lists.',
    'They are, but both jobs start at sunrise in different places.',
    'Then leave me on the driving list. I can borrow my sister’s car, and Noor wanted to collect samples.',
  ],
  [
    'What caused the scheduling problem?|One volunteer selected simultaneous jobs at different sites.|Two drivers reserved the same car.|The survey changed its starting time.|The sampling site was moved.',
    'Why does the volunteer keep the driving assignment?|A vehicle is available and another person wants the other job.|Sampling requires a qualification.|The driving shift finishes earlier.|The river cannot be reached on foot.',
  ],
)
scene(
  'conversation',
  6,
  'Returning a book',
  [
    'The library says this book is overdue, but I dropped it in the box on Sunday.',
    'The box at the north entrance? That one belongs to the city library.',
    'I did not realize that. Do I have to go and get it?',
    'They send our books over every Wednesday. I will make a note on your account while we wait.',
  ],
  [
    'Where did the student leave the book?|In another library’s return box.|On a shelf near the north stairs.|At the university desk.|In a classroom.',
    'What does the librarian intend to do?|Record the explanation while the book is in transit.|Charge a replacement fee.|Ask the student to collect the book.|Move the return box.',
  ],
)
scene(
  'announcement',
  0,
  'A returning visitor',
  [
    'If you came to last year’s moth count, bring your old notebook on Friday. We want to compare observations made at the same lamp. New volunteers are welcome too. We will pair you with someone who knows the route, so there is no need to buy a guidebook.',
  ],
  [
    'Why are last year’s notebooks useful?|They provide observations from the same location.|They contain the new route.|They replace a registration form.|They show which lamps need repairs.',
    'What arrangement is available for newcomers?|They can walk with an experienced volunteer.|They get a free guidebook.|They can join only on a second night.|They are assigned a different lamp.',
  ],
)
scene(
  'announcement',
  1,
  'Keys at closing time',
  [
    'The studio closes at six as usual. Today, though, the key desk will shut at five for a staff meeting. If you stay past five, return your key to the envelope slot beside the studio door. Write your name on the envelope, not on the key.',
  ],
  [
    'Which service is closing early today?|The key desk.|The studio itself.|The envelope slot.|The building entrance.',
    'What should a student leaving at five thirty label?|The envelope holding the key.|The key itself.|The studio door.|The staff meeting list.',
  ],
)
scene(
  'announcement',
  2,
  'Waiting list for the kiln',
  [
    'Three places have opened in the pottery workshop. We have already emailed the first three people on the waiting list. Those invitations expire at noon tomorrow. Please do not come early hoping to claim a place: we will contact the next person on the list when an invitation expires.',
  ],
  [
    'What determines who gets the next invitation?|Position on the waiting list.|Arrival time at the studio.|Previous pottery experience.|Speed of paying a fee.',
    'What happens at noon tomorrow?|Unaccepted invitations can pass to other people.|The workshop begins.|Registration opens to everyone.|All participants must arrive.',
  ],
)
scene(
  'announcement',
  3,
  'Finding the field station',
  [
    'On Saturday the group will meet at the wooden shelter, not at the station building. From the bus stop, cross the little footbridge. The shelter is on your left before the path divides. If you reach the pond, turn around: you have gone too far.',
  ],
  [
    'Which landmark indicates that a visitor has passed the meeting point?|The pond.|The bus stop.|The footbridge.|The wooden shelter.',
    'Where is the group gathering?|On the far side of the footbridge before the fork.|Inside the station building.|At the bus stop.|At the edge of the pond.',
  ],
)
scene(
  'announcement',
  4,
  'New seating trial',
  [
    'You may notice that the tables by the windows now face each other. We are trying this arrangement for one week to see whether small groups use the room more often. Individual desks near the entrance have stayed where they were. Leave comments on the card by the exit.',
  ],
  [
    'What is the purpose of moving the tables?|To test whether the arrangement attracts small groups.|To improve the view for individual readers.|To clear space at the entrance.|To make room for new desks.',
    'How can users influence the trial?|Write feedback before leaving.|Reserve a window seat.|Move individual desks.|Sign up for a group.',
  ],
)
scene(
  'talk',
  0,
  'The silent interval',
  [
    'A familiar melody can survive a surprising interruption. Imagine hearing its opening notes, followed by a short silence, and then the final note exactly when you expect it. You may feel as if the missing notes continued in your head. Move that final note slightly later and the gap becomes much more obvious. The difference tells us something about listening: people form expectations about when an event will occur as well as what it will sound like. This also explains why a familiar melody is useful in the demonstration. A listener who has never heard the tune has less basis for predicting its ending.',
  ],
  [
    'What is the main function of the melody demonstration?|To illustrate expectations about timing.|To identify the pitch of a missing note.|To compare two instruments.|To measure how long a note lasts.',
    'Which change makes the interruption easier to notice?|Delaying the final note.|Repeating the opening.|Making the silence quieter.|Using the same instrument.',
    'Why would an unfamiliar tune be less effective?|Its ending is harder to anticipate.|Its notes are necessarily shorter.|Listeners would sing along.|It would contain no silence.',
    'What distinction does the lecturer draw?|Predicting what happens and predicting when it happens.|Music and ordinary noise.|Short tunes and simple tunes.|Performing and composing.',
  ],
)
scene(
  'talk',
  1,
  'Borrowing a word',
  [
    'When a language borrows a word, it does not always borrow every meaning. Consider a fictional coastal town where visitors call any small boat a tala. Local fishers already have names for their own boats. They begin using tala only for the visitors’ narrow racing boats. A dictionary made fifty years later might therefore define tala as a racing boat. That definition accurately describes the town’s usage, even though it would surprise the original speakers. Notice that the shape of the word barely changed. It was the range of things it could refer to that narrowed.',
  ],
  [
    'How is the example organized?|It traces a word from broad use to a narrower local meaning.|It compares the spelling of two dictionaries.|It lists the stages of boat construction.|It explains why a language disappeared.',
    'Why did local fishers have little need for a general boat term?|They already had terms for their own vessels.|They used only racing boats.|Visitors spoke the local language.|They had stopped fishing.',
    'What would surprise the visitors about the later definition?|It excludes boats their word originally included.|It spells the word differently.|It refers only to fishing.|It describes a larger vessel.',
    'What stayed relatively stable in this example?|The form of the word.|The number of boat types it named.|The boats used by visitors.|The dictionary definition.',
  ],
)
scene(
  'talk',
  2,
  'Finding north beneath clouds',
  [
    'A walker can use the sun as a rough guide, but a shadow alone does not tell you which way is north. Its direction changes during the day. One approach is to mark the tip of a stick’s shadow, wait, and mark it again. The two marks reveal movement that a single observation cannot show. This method depends on the stick staying still. Imagine moving the stick between marks: the second point would then combine two effects, the changing position of the sun and the changing position of the stick. You could no longer interpret the pair in the same way.',
  ],
  [
    'Why is one shadow mark insufficient?|It contains no information about the shadow’s movement.|It is always too faint.|It appears only at noon.|It already points exactly north.',
    'What must remain fixed between observations?|The stick.|The tip of its shadow.|The sun.|The observer’s watch.',
    'Why does the speaker imagine moving the stick?|To show how a second cause would complicate interpretation.|To recommend a faster method.|To correct the first mark.|To measure the stick’s length.',
    'What broader idea does this example illustrate?|A comparison is informative when the relevant reference stays stable.|An instrument must be complicated to be accurate.|A later observation is always better.|Shadows move at the same speed all day.',
  ],
)
scene(
  'talk',
  3,
  'Reading a repaired bowl',
  [
    'A ceramic bowl can tell us more after it breaks. In one collection, two holes appear on opposite sides of an old crack. Both holes are smooth, while the edge of a recent chip is sharp. One interpretation is that a cord once passed through the holes to hold the bowl together. The holes alone cannot tell us what the bowl held after repair. It might have leaked, yet it could still have stored grain. This possibility matters because a broken object in a collection is sometimes described as if its useful life ended at the first crack.',
  ],
  [
    'What detail supports the idea of a deliberate repair?|Paired holes lie on opposite sides of the crack.|The bowl has a recent sharp chip.|The bowl is in a collection.|No cord remains.',
    'What uncertainty does the lecturer emphasize?|The use of the bowl after repair.|Whether the bowl is ceramic.|Whether grain existed.|The location of the crack.',
    'Why is grain mentioned?|It illustrates a use that would not require a watertight bowl.|It was discovered in the holes.|It explains the recent chip.|It dates the original crack.',
    'Which assumption does the lecturer challenge?|Damage immediately ended the bowl’s usefulness.|Cords could be used in repairs.|Sharp chips can be recent.|Bowls could store dry material.',
  ],
)
scene(
  'talk',
  4,
  'A queue with two exits',
  [
    'Picture visitors leaving a hall through two identical doors. Everyone walks toward the nearest door until a queue forms. Now a guide opens a third door behind a curtain, but the queue remains almost unchanged. Why? People at the back can see the line in front of them; they cannot see the new exit. Once a few people visibly turn toward the third door, others follow. The example separates capacity from information. Increasing capacity creates a possibility for faster movement. Whether people make use of it depends on what they can discover from their surroundings.',
  ],
  [
    'Why does the new door initially have little effect?|It is outside the waiting visitors’ view.|It opens into the same queue.|It is smaller than the other doors.|The guide keeps it locked.',
    'What changes when a few visitors turn?|Their behavior makes the alternative visible.|The corridor becomes wider.|The original doors close.|The guide moves the curtain back.',
    'What does the speaker mean by capacity?|The amount of movement the exits could accommodate.|The number of visitors who know the hall.|The length of the curtain.|The speed of the guide.',
    'Which intervention follows most directly from the example?|Place a visible sign pointing to the extra exit.|Make the hidden door heavier.|Extend the existing queue.|Ask everyone to choose the nearest door.',
  ],
)
