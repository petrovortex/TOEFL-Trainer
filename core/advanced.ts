import type { Item } from './types.ts'

// Each question is tied to evidence in its own passage. Distractors target a specific misreading.
const reports = [
  {
    title: 'An archive of ordinary purchases',
    text: 'A town archive contains hundreds of receipts from a grocer who traded near the harbor. A historian initially treated the receipts as a record of the town’s diet. Salted fish appeared on nearly every page, whereas fresh vegetables were mentioned only occasionally. Before concluding that residents rarely ate vegetables, she asked what activities produced a written record. Fish arrived by boat and had to be weighed and paid for at the shop. Vegetables, by contrast, often came from household gardens or were exchanged between neighbors. Neither activity required the grocer to issue a receipt. The historian then compared the receipts with household letters. Several letters discussed a shortage of cabbages in a year when the grocer’s vegetable sales barely changed. This apparent disagreement was informative. It suggested that the archive had captured one route by which food reached households, while leaving other routes almost invisible.',
    qa: [
      [
        'What problem did the historian identify?',
        'The receipts recorded only some ways of obtaining food.',
        'The grocer usually recorded the wrong weight.',
        'Most of the receipts came from a different town.',
        'The letters described a different period.',
      ],
      [
        'Why does the passage mention household gardens?',
        'They illustrate a source of food that left few shop records.',
        'They explain why fish was difficult to sell.',
        'They show that vegetable shortages were impossible.',
        'They identify the grocer’s main suppliers.',
      ],
      [
        'What does the cabbage shortage contribute to the argument?',
        'It reveals a change in supply that shop sales did not reflect.',
        'It confirms that vegetable sales rose during shortages.',
        'It proves that the grocer destroyed some receipts.',
        'It contradicts the dates in the household letters.',
      ],
      [
        'What can be inferred about counted transactions?',
        'Their frequency need not match the frequency of consumption.',
        'They give a complete picture when there are enough receipts.',
        'They are less reliable for fish than for vegetables.',
        'Their value depends entirely on accurate prices.',
      ],
      [
        'What is the function of the final sentence?',
        'It qualifies what the receipts can establish.',
        'It proposes a new explanation for a cabbage shortage.',
        'It dismisses the information in the letters.',
        'It identifies the food most often eaten.',
      ],
    ],
  },
  {
    title: 'Why the path through the park bends',
    text: 'On a plan drawn before a riverside park was built, the main path runs directly from the gate to a bridge. The path visible today takes a longer route around a small hollow. Some visitors assume that the bend was intended to give walkers a view of the river. Maintenance records tell a different story. After heavy rain, water gathered in the hollow and softened the original path. Replacing the surface each spring proved expensive. Workers eventually moved the path to higher ground, where repairs were less frequent. A bench overlooking the river was installed several years later. Its position makes the bend look deliberate in a way that conceals the sequence of events. This example illustrates a difficulty in interpreting designed landscapes: features that now seem to form a single plan can result from separate decisions made for quite different reasons.',
    qa: [
      [
        'What prompted the relocation of the path?',
        'Repeated water damage made maintenance costly.',
        'Visitors requested a better river view.',
        'The bridge had moved to higher ground.',
        'Workers needed space to install the bench.',
      ],
      [
        'Why is the date of the bench’s installation important?',
        'It shows that the bench could not have motivated the original bend.',
        'It identifies when the river first flooded.',
        'It proves the path was briefly closed.',
        'It establishes that the bench was in the initial plan.',
      ],
      [
        'The word “conceals” most nearly means what here?',
        'Makes something less apparent',
        'Brings something to a conclusion',
        'Preserves something intact',
        'Proves something inaccurate',
      ],
      [
        'What broader point does the author draw?',
        'Present-day coherence may have several historical causes.',
        'Successful parks must be designed as a whole.',
        'Maintenance records usually overstate repair costs.',
        'Scenic features make parks less practical.',
      ],
      [
        'Which finding would most directly weaken the visitors’ assumption?',
        'A dated repair order directing workers to avoid the wet hollow.',
        'A survey showing that visitors enjoy the river view.',
        'A photograph showing the bench beside the path today.',
        'A map showing the location of the gate.',
      ],
    ],
  },
  {
    title: 'When an average conceals a pattern',
    text: 'A researcher compared waiting times at two campus cafés. The first café had a shorter average wait on Monday, and it also had a shorter average wait on Tuesday. Yet when she combined all visits from both days, the second café appeared faster. No measurement was wrong. Monday was busy at both cafés, and most visits to the first café occurred on that busy day. Most visits to the second café occurred on Tuesday, when the campus was quieter. Combining the visits therefore gave the two days different weights at each café. The researcher concluded that neither comparison was automatically preferable. A student choosing a café on a particular day would find the daily figures useful. A manager interested in the experience of all customers who actually visited would have a reason to examine the combined figures.',
    qa: [
      [
        'Why could the combined ranking differ from the daily rankings?',
        'The distribution of visits across busy and quiet days differed.',
        'The researcher omitted visits made on Tuesday.',
        'The cafés measured waiting time in different units.',
        'Customers changed cafés while waiting.',
      ],
      [
        'Which detail explains why the first café was disadvantaged in the combined result?',
        'A large share of its visits occurred on the busier day.',
        'It had fewer customers on both days.',
        'Its daily averages excluded short waits.',
        'Its Monday measurements came from a different researcher.',
      ],
      [
        'What does “weights” refer to here?',
        'The influence of each day’s visits on a combined average',
        'The importance of each café to the campus',
        'The accuracy of the clocks in the cafés',
        'The number of staff assigned to each café',
      ],
      [
        'Why does the author introduce a manager in the final sentence?',
        'To show a purpose for which the combined figures are relevant.',
        'To suggest that daily figures should be discarded.',
        'To identify who made the measurement error.',
        'To argue that busy cafés need more staff.',
      ],
      [
        'Which question can the daily figures answer most directly?',
        'Which café had the shorter average wait on Monday?',
        'Which café made the greater profit that week?',
        'Which café attracted more returning customers?',
        'Which café will have the shortest wait next month?',
      ],
    ],
  },
]
const additional = [
  [
    'A shared bicycle',
    'A bicycle library lends sturdy bicycles for a day at a time. Its organizers originally planned to charge a small fee for every hour. In a trial, however, some riders returned their bicycles before finishing an errand because they were watching the clock. The organizers switched to a fixed daily fee. A rider who needed one more hour could then keep the bicycle without deciding whether that hour was worth an extra payment. The change also affected availability: fewer bicycles came back at lunchtime. To keep a supply for short afternoon journeys, staff reserved several bicycles for loans beginning after noon. The two rules addressed different concerns, and neither rule by itself would have met both needs.',
    [
      'Why did some riders cut their errands short?|They wanted to avoid an additional charge.|The library closed at noon.|Bicycles were needed for a trial race.|Their reservations expired after one hour.',
      'What did the daily fee remove?|The cost decision about each extra hour.|The obligation to return a bicycle.|The limit on the number of riders.|The need to reserve a bicycle.',
      'How did the fee change affect lunchtime availability?|More bicycles remained with morning riders.|More bicycles were returned early.|Afternoon riders stopped visiting.|Staff bought additional bicycles.',
      'Which rider benefits most from the reservation rule?|Someone who arrives after noon for a short trip.|Someone who wants an overnight loan.|Someone returning a damaged bicycle.|Someone asking for a refund.',
      'What is the author’s main point?|Two complementary rules balanced competing needs.|Charging by the hour is always cheaper.|Short trips require special bicycles.|The library should serve only morning riders.',
    ],
  ],
  [
    'Listening for a bird',
    'A bird survey based on sound does not count every bird equally well. A bird that sings frequently is more likely to be recorded than one that remains quiet. Researchers sometimes visit the same site several times instead of listening for a very long period on one day. If a bird is heard on the second visit but not the first, the difference need not mean that it has just arrived. It may have been present but silent. Repeated visits therefore provide information about the chance of detecting a bird that is already there. They do not remove all uncertainty: a species that never calls during the survey can still go unrecorded.',
    [
      'Which bird is most likely to appear in a sound survey?|One that calls frequently.|One that is largest.|One that has just arrived.|One that nests closest to the ground.',
      'Why does the passage describe a second visit?|To distinguish presence from detection.|To date a bird’s arrival exactly.|To compare the sizes of two sites.|To identify birds by color.',
      'What can be inferred about a silent first visit?|It gives limited evidence about whether a bird was present.|It proves no bird used the site.|It requires ending the survey.|It invalidates later observations.',
      'What does “there” refer to in the discussion of detection?|The survey site.|The researcher’s notes.|A different nesting area.|A sound recording.',
      'What limitation remains after repeated visits?|A bird may remain silent throughout.|Recordings become impossible to compare.|Researchers cannot return to a site.|Calls become less recognizable each day.',
    ],
  ],
  [
    'Why a label stays visible',
    'In an old printing shop, narrow drawers held hundreds of pieces of metal type. A label pasted to the front of a drawer could be read while the drawer was closed, but not easily from above once it was open. One printer added a second label to the inside edge. A visitor described this as a waste of paper because both labels carried the same word. The visitor overlooked the sequence of actions: a worker first selected a drawer and then, with several drawers open, had to return each piece of type to its proper place. The second label served the later action. An object that looks redundant when viewed at rest may be useful when observed in use.',
    [
      'What objection did the visitor raise?|Both labels contained identical information.|The labels were hard to print.|The type was arranged alphabetically.|Open drawers took up space.',
      'When was the inside label most useful?|When workers were returning type to open drawers.|When visitors first entered the shop.|When a drawer was completely closed.|When a label was being pasted on.',
      'Why does the author describe the order of actions?|It explains how the labels served different purposes.|It explains how metal type was manufactured.|It shows that the shop kept a written schedule.|It shows why drawers had different widths.',
      'Which example best matches the printer’s solution?|A case labeled on the lid and inside so it can be identified in either position.|A drawer painted twice with the same color to hide scratches.|A cabinet with every drawer open at once.|A label replaced whenever its wording changes.',
      'What does “redundant” suggest here?|Apparently unnecessary because it duplicates something.|Difficult to read from any position.|Made from an unusual material.|Kept only for visitors.',
    ],
  ],
  [
    'Two ways to cool a room',
    'A stone wall can delay the warming of a room during the day by absorbing heat. After sunset it can release some of that stored heat. Whether this delay is helpful depends on what happens at night. In a place with cool nights, opening windows can carry heat away before the following day. In a place where nights remain hot, the wall may still be warm the next morning. The wall has shifted the timing of heat flow, but it has not made the heat disappear. This is why a building feature that works well in one climate may disappoint when copied elsewhere, even when builders use exactly the same materials.',
    [
      'What does the wall do during a warm day?|Temporarily stores some heat.|Destroys incoming heat.|Creates a cool night outside.|Prevents all airflow.',
      'When are open windows most useful in the example?|When nighttime air can carry stored heat away.|When the outside air stays hotter than the room.|Only during construction.|Before the wall has absorbed any heat.',
      'Why might a copied building feature disappoint?|The new climate may prevent the wall from cooling at night.|Stone changes composition in transit.|Windows cannot be opened in warm climates.|The copied wall must be thinner.',
      'Why does the author distinguish delay from disappearance?|Stored heat can affect the room later.|The temperature never changes indoors.|All materials release heat immediately.|Delays occur only after sunset.',
      'How is the argument developed?|A physical process is followed by contrasting conditions.|Two building materials are ranked by price.|A historical practice is dismissed as ineffective.|A measurement is corrected using a new instrument.',
    ],
  ],
] as const
const authored = additional.map(([title, text, quiz]) => ({
  title,
  text,
  qa: quiz.map((s) => s.split('|')),
}))
export const advanced: Item[] = [...reports, ...authored].flatMap(
  ({ title, text, qa }, i) =>
    qa.map(([prompt, ...options], j) => ({
      id: 'advanced-' + i + '-' + j,
      task: 'passage',
      title,
      passage: text,
      prompt,
      level: i < 3 ? 3 : 1 + (i % 2),
      options,
      keys: [options[0]],
      evidence: options[0] + '. See the explanation in the passage.',
      group: 'advanced-' + i,
    })),
)
