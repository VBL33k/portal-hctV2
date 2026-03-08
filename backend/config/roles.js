// IDs des rôles Discord du serveur HCT
const ROLE_IDS = {
  SECURITE:       process.env.ROLE_SECURITE      || '1071147009215565875',
  INTERNE:        process.env.ROLE_INTERNE        || '805480586814423050',
  JUNIOR_RESIDENT:process.env.ROLE_JUNIOR_RESIDENT|| '1140971706039685150',
  RESIDENT:       process.env.ROLE_RESIDENT       || '805481769201172510',
  MEDECIN:        process.env.ROLE_MEDECIN        || '805485691080802355',
  DOCTOR:         process.env.ROLE_DOCTOR         || '1141728911340867614',
  SENIOR_DOCTOR:  process.env.ROLE_SENIOR_DOCTOR  || '805481781239349278',
  EMT_B:          process.env.ROLE_EMT_B          || '805486065661771826',
  EMT_A:          process.env.ROLE_EMT_A          || '805486069931180032',
  EMT_P:          process.env.ROLE_EMT_P          || '805486072272125983',
  PROFESSEUR:     process.env.ROLE_PROFESSEUR     || '860189666908045323',
  SHIFT_SPV:      process.env.ROLE_SHIFT_SPV      || '1140657047126425660',
  HDP:            process.env.ROLE_HDP            || '809086773326118952',
  DEPUTY_CHIEF:   process.env.ROLE_DEPUTY_CHIEF   || '805518674806046733',
  CHIEF:          process.env.ROLE_CHIEF          || '805481782119104522',
  DEO:            process.env.ROLE_DEO            || '805551419905015818',
  CEO:            process.env.ROLE_CEO            || '805508029151313921',
  DRH:            process.env.ROLE_DRH            || '1377632925939666974',
  RH_SIMPLE:      process.env.ROLE_RH_SIMPLE      || '1407313203326877696',
}

// Niveau hiérarchique (plus grand = plus élevé)
// Note: MEDECIN retiré de la hiérarchie (rôle cumulatif Discord, pas un grade spécifique)
// Note: SHIFT_SPV > HDP pour que Shift Supervisor ait priorité quand les deux rôles sont présents
const ROLE_HIERARCHY = {
  [ROLE_IDS.SECURITE]:        0,
  [ROLE_IDS.INTERNE]:         1,
  [ROLE_IDS.JUNIOR_RESIDENT]: 2,
  [ROLE_IDS.RESIDENT]:        3,
  [ROLE_IDS.DOCTOR]:          5,
  [ROLE_IDS.SENIOR_DOCTOR]:   6,
  [ROLE_IDS.EMT_B]:           7,
  [ROLE_IDS.EMT_A]:           8,
  [ROLE_IDS.EMT_P]:           9,
  [ROLE_IDS.PROFESSEUR]:      10,
  [ROLE_IDS.HDP]:             11,
  [ROLE_IDS.SHIFT_SPV]:       12,
  [ROLE_IDS.DEPUTY_CHIEF]:    13,
  [ROLE_IDS.CHIEF]:           14,
  [ROLE_IDS.DEO]:             15,
  [ROLE_IDS.CEO]:             16,
  [ROLE_IDS.DRH]:             17,
  [ROLE_IDS.RH_SIMPLE]:       13,
}

const ROLE_NAMES = {
  [ROLE_IDS.SECURITE]:        'Sécurité Hospitalière',
  [ROLE_IDS.INTERNE]:         'Interne',
  [ROLE_IDS.JUNIOR_RESIDENT]: 'Junior Resident',
  [ROLE_IDS.RESIDENT]:        'Resident',
  [ROLE_IDS.MEDECIN]:         'Médecin',
  [ROLE_IDS.DOCTOR]:          'Doctor',
  [ROLE_IDS.SENIOR_DOCTOR]:   'Senior Doctor',
  [ROLE_IDS.EMT_B]:           'EMT-B',
  [ROLE_IDS.EMT_A]:           'EMT-A',
  [ROLE_IDS.EMT_P]:           'EMT-P',
  [ROLE_IDS.PROFESSEUR]:      'Professeur',
  [ROLE_IDS.SHIFT_SPV]:       'Shift Supervisor',
  [ROLE_IDS.HDP]:             'Head Of Department',
  [ROLE_IDS.DEPUTY_CHIEF]:    'Deputy Chief',
  [ROLE_IDS.CHIEF]:           'Chief',
  [ROLE_IDS.DEO]:             'DEO',
  [ROLE_IDS.CEO]:             'CEO',
  [ROLE_IDS.DRH]:             'DRH',
  [ROLE_IDS.RH_SIMPLE]:       'RH',
}

// Niveau minimum pour être considéré manager (accès admin)
const MANAGER_MIN_LEVEL = ROLE_HIERARCHY[ROLE_IDS.HDP]

function getHighestRole(memberRoleIds = []) {
  let highest = null
  let highestLevel = -1
  for (const roleId of memberRoleIds) {
    const level = ROLE_HIERARCHY[roleId]
    if (level !== undefined && level > highestLevel) {
      highestLevel = level
      highest = roleId
    }
  }
  return highest
}

function getUserLevel(memberRoleIds = []) {
  const role = getHighestRole(memberRoleIds)
  return role ? (ROLE_HIERARCHY[role] ?? -1) : -1
}

function getPosteName(memberRoleIds = []) {
  const role = getHighestRole(memberRoleIds)
  return role ? (ROLE_NAMES[role] || 'Non défini') : 'Non défini'
}

function isManager(memberRoleIds = []) {
  return getUserLevel(memberRoleIds) >= MANAGER_MIN_LEVEL
}

function isAdmin(memberRoleIds = []) {
  return getUserLevel(memberRoleIds) >= ROLE_HIERARCHY[ROLE_IDS.DEO]
}

// Niveau minimum pour créer/gérer des templates BBCode (HDP et supérieur)
function isSupervisor(memberRoleIds = []) {
  return getUserLevel(memberRoleIds) >= ROLE_HIERARCHY[ROLE_IDS.HDP]
}

// Notes de service — Shift Supervisor et supérieur (exclut HDP niveau 11)
function isShiftSupervisor(memberRoleIds = []) {
  return getUserLevel(memberRoleIds) >= ROLE_HIERARCHY[ROLE_IDS.SHIFT_SPV]
}

// Accès complet — Deputy Chief et supérieur (incluant RH_SIMPLE au même niveau 13)
function isFullAdmin(memberRoleIds = []) {
  return getUserLevel(memberRoleIds) >= ROLE_HIERARCHY[ROLE_IDS.DEPUTY_CHIEF]
}

module.exports = {
  ROLE_IDS,
  ROLE_HIERARCHY,
  ROLE_NAMES,
  MANAGER_MIN_LEVEL,
  getHighestRole,
  getUserLevel,
  getPosteName,
  isManager,
  isAdmin,
  isSupervisor,
  isShiftSupervisor,
  isFullAdmin,
}
