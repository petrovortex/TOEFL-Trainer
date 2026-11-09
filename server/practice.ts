import { randomBytes, randomUUID } from 'node:crypto'
import { buildStages, learnerTrend } from '../core/exam.ts'
import {
  catalog,
  units,
  type Stage,
  type Task,
  type PracticeLength,
} from '../core/types.ts'
import { exposures, extras, recent } from './store.ts'
import { materialSets } from '../core/material.ts'
interface Plan {
  id: string
  seed: number
  task: Task
  length: PracticeLength
  stages: Stage[]
  expires: number
}
const plans = new Map<string, Plan>()
export function practicePlan(task: Task, length: PracticeLength = 'standard') {
  if (!catalog[task]) throw Error('Unknown exercise.')
  for (const [id, plan] of plans)
    if (plan.expires < Date.now()) plans.delete(id)
  const seed = randomBytes(4).readUInt32LE()
  const trend = { ...learnerTrend(recent(), task), lastUsed: exposures() }
  const stages = buildStages('drill', task, seed, trend, extras(), length)
  const plan: Plan = {
    id: randomUUID(),
    seed,
    task,
    length,
    stages,
    expires: Date.now() + 1800000,
  }
  plans.set(plan.id, plan)
  const items = stages[0].items,
    sets = materialSets(items).length
  return {
    planId: plan.id,
    task,
    length,
    questions: items.reduce((n, q) => n + units(q), 0),
    responses: items.length,
    sets,
  }
}
export function consumePlan(id: string, task: string) {
  const plan = plans.get(id)
  if (!plan || plan.expires < Date.now() || plan.task !== task)
    throw Error('Practice preview expired. Choose the length again.')
  plans.delete(id)
  return plan
}
