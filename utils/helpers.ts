export type Language = 'EN' | 'FR';
export type DateFormat = 'ISO' | 'US' | 'EU';

export const formatDate = (dateStr: string | undefined, format: DateFormat): string => {
  if (!dateStr) return '-';
  try {
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    
    if (format === 'US') return `${m}/${d}/${y}`; // MM/DD/YYYY
    if (format === 'EU') return `${d}/${m}/${y}`; // DD/MM/YYYY
    return dateStr; // YYYY-MM-DD
  } catch (e) {
    return dateStr;
  }
};

export const translations = {
  EN: {
    common: {
      prev: 'Previous',
      next: 'Next',
      page: 'Page',
      of: 'of',
      show: 'Show',
      rows: 'rows'
    },
    sidebar: {
      home: 'Home',
      herd: 'Herd List',
      protocols: 'Protocols',
      insemination: 'Insemination',
      reports: 'Vet Check',
      users: 'Users',
      settings: 'Settings',
      searchPlaceholder: 'Find Cow ID...'
    },
    dashboard: {
      title: 'Farm Dashboard',
      herdCard: 'Herd List',
      herdSubtitle: 'View animals',
      protocolsCard: 'Protocols',
      protocolsSubtitle: 'Manage & Plan',
      insemCard: 'Insemination',
      insemSubtitle: 'Semen inventory & breeding',
      reportsCard: 'Vet Check',
      reportsSubtitle: 'Health records & analysis',
      usersCard: 'Users',
      usersSubtitle: 'Manage access & roles',
      settingsCard: 'Settings',
      settingsSubtitle: 'Language & Dates'
    },
    herdList: {
      title: 'Master Herd List',
      importBtn: 'Import / Update',
      filterAll: 'ALL STATUS',
      cleaningOptions: 'Cleaning Options',
      optDates: 'Fix Date Formats',
      optStatus: 'Standardize Status Codes',
      optFill: 'Auto-fill Missing Data'
    },
    cowDetail: {
      history: 'History',
      newEvents: 'New Event',
      prodSummary: 'Production Summary',
      lastTest: 'Last Test',
      lactAvg: 'Lactation Avg',
      pedigree: 'Pedigree & Info',
      birthDate: 'Birth Date',
      sire: 'Sire',
      age: 'Age'
    },
    protocols: {
      title: 'Protocol Management',
      subtitle: 'Reproduction synchronization & treatment tracking',
      tabs: {
        definitions: 'Definitions',
        planning: 'Planning',
        inProgress: 'In Progress',
        completed: 'Completed'
      },
      selectCows: 'Select Cows',
      importList: 'Import List (Excel)',
      configuration: 'Configuration',
      startProtocol: 'Start Protocol',
      markDone: 'Mark Done',
      edit: 'Edit',
      create: 'Create New Protocol',
      steps: 'Steps',
      save: 'Save Protocol',
      cancel: 'Cancel',
      lastMod: 'Applied since:'
    },
    settings: {
      title: 'System Settings',
      language: 'Language / Langue',
      dateFormat: 'Date Format / Format de Date',
      save: 'Save Changes'
    }
  },
  FR: {
    common: {
      prev: 'Précédent',
      next: 'Suivant',
      page: 'Page',
      of: 'sur',
      show: 'Afficher',
      rows: 'lignes'
    },
    sidebar: {
      home: 'Accueil',
      herd: 'Troupeau',
      protocols: 'Protocoles',
      insemination: 'Insémination',
      reports: 'Visite Vétérinaire',
      users: 'Utilisateurs',
      settings: 'Paramètres',
      searchPlaceholder: 'Chercher Vache...'
    },
    dashboard: {
      title: 'Tableau de Bord',
      herdCard: 'Liste Troupeau',
      herdSubtitle: 'Voir les animaux',
      protocolsCard: 'Protocoles',
      protocolsSubtitle: 'Gestion & Planification',
      insemCard: 'Insémination',
      insemSubtitle: 'Stock semence & IA',
      reportsCard: 'Santé',
      reportsSubtitle: 'Analyses & Rapports',
      usersCard: 'Utilisateurs',
      usersSubtitle: 'Accès & Rôles',
      settingsCard: 'Paramètres',
      settingsSubtitle: 'Langue & Dates'
    },
    herdList: {
      title: 'Liste Complète',
      importBtn: 'Importer / MàJ',
      filterAll: 'TOUS STATUTS',
      cleaningOptions: 'Options de Nettoyage',
      optDates: 'Corriger les formats de date',
      optStatus: 'Standardiser les statuts',
      optFill: 'Remplir les données manquantes'
    },
    cowDetail: {
      history: 'Historique',
      newEvents: 'Nouvel Événement',
      prodSummary: 'Production Laitière',
      lastTest: 'Dernier Contrôle',
      lactAvg: 'Moyenne Lact.',
      pedigree: 'Généalogie & Infos',
      birthDate: 'Date Naissance',
      sire: 'Père',
      age: 'Âge'
    },
    protocols: {
      title: 'Gestion des Protocoles',
      subtitle: 'Synchronisation & traitements',
      tabs: {
        definitions: 'Définitions',
        planning: 'Planification',
        inProgress: 'En Cours',
        completed: 'Terminés'
      },
      selectCows: '1. Sélectionner Vaches',
      importList: 'Importer Liste (Excel)',
      configuration: '2. Configuration',
      startProtocol: 'Lancer Protocole',
      markDone: 'Terminé',
      edit: 'Modifier',
      create: 'Créer Nouveau Protocole',
      steps: 'Étapes',
      save: 'Enregistrer',
      cancel: 'Annuler',
      lastMod: 'Appliqué depuis :'
    },
    settings: {
      title: 'Paramètres Système',
      language: 'Language / Langue',
      dateFormat: 'Date Format / Format de Date',
      save: 'Enregistrer'
    }
  }
};