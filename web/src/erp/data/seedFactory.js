import { moduleDefinitions } from '../config/moduleDefinitions'

export const createInitialModuleData = () => {
  const initialData = {}

  moduleDefinitions.forEach((moduleItem) => {
    initialData[moduleItem.key] = (moduleItem.seed || []).map((record, index) => ({
      id: `${moduleItem.key}-${index + 1}`,
      ...record,
    }))
  })

  return initialData
}
