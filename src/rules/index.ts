import * as noMisusedRailways from './no-misused-railways'
import * as noFloatingRailways from './no-floating-railways'

export const rules = {
  [noMisusedRailways.name]: noMisusedRailways.rule,
  [noFloatingRailways.name]: noFloatingRailways.rule,
}
