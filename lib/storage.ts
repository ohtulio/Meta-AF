import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  LeitoDeFusao,
  OperationalRecord,
  Person,
  Task,
  InventoryItem,
  AppConfig,
} from "./types";

const KEYS = {
  leitos: "alto_forno_leitos",
  operational: "alto_forno_operational",
  people: "alto_forno_people",
  tasks: "alto_forno_tasks",
  inventory: "alto_forno_inventory",
  config: "alto_forno_config",
};

// ======================
// Utils
// ======================

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

async function safeGet<T>(key: string): Promise<T[]> {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Erro ao ler storage:", key, error);
    return [];
  }
}

async function safeSave<T>(key: string, list: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch (error) {
    console.error("Erro ao salvar storage:", key, error);
  }
}

// ======================
// Leitos
// ======================

export const leitoStorage = {
  getAll: () => safeGet<LeitoDeFusao>(KEYS.leitos),

  save: async (leito: Omit<LeitoDeFusao, "id" | "version">) => {
    const list = await safeGet<LeitoDeFusao>(KEYS.leitos);

    const newItem: LeitoDeFusao = {
      ...deepCopy(leito),
      id: generateId(),
      version: 1,
    };

    list.unshift(newItem);
    await safeSave(KEYS.leitos, list);

    return newItem;
  },

  update: async (leito: LeitoDeFusao) => {
    const list = await safeGet<LeitoDeFusao>(KEYS.leitos);

    const idx = list.findIndex((l) => l.id === leito.id);

    if (idx !== -1) {
      leito.version += 1;
      list[idx] = deepCopy(leito);
      await safeSave(KEYS.leitos, list);
    }

    return leito;
  },

  delete: async (id: string) => {
    const list = await safeGet<LeitoDeFusao>(KEYS.leitos);
    await safeSave(
      KEYS.leitos,
      list.filter((l) => l.id !== id)
    );
  },

  duplicate: async (id: string) => {
    const list = await safeGet<LeitoDeFusao>(KEYS.leitos);

    const original = list.find((l) => l.id === id);
    if (!original) return null;

    const newItem: LeitoDeFusao = {
      ...deepCopy(original),
      id: generateId(),
      name: `${original.name} (cópia)`,
      createdAt: new Date().toISOString(),
      status: "simulated",
      version: 1,
    };

    list.unshift(newItem);
    await safeSave(KEYS.leitos, list);

    return newItem;
  },
};

// ======================
// Operacional
// ======================

export const operationalStorage = {
  getAll: () => safeGet<OperationalRecord>(KEYS.operational),

  save: async (
    record: Omit<OperationalRecord, "id" | "leitoSnapshot"> & {
      leito: LeitoDeFusao;
    }
  ) => {
    const list = await safeGet<OperationalRecord>(KEYS.operational);

    const newItem: OperationalRecord = {
      ...record,
      id: generateId(),
      leitoSnapshot: deepCopy(record.leito),
    };

    list.unshift(newItem);
    await safeSave(KEYS.operational, list);

    return newItem;
  },

  delete: async (id: string) => {
    const list = await safeGet<OperationalRecord>(KEYS.operational);
    await safeSave(
      KEYS.operational,
      list.filter((r) => r.id !== id)
    );
  },
};

// ======================
// Pessoas
// ======================

export const peopleStorage = {
  getAll: () => safeGet<Person>(KEYS.people),

  save: async (person: Omit<Person, "id">) => {
    const list = await safeGet<Person>(KEYS.people);

    const newItem: Person = {
      ...person,
      id: generateId(),
    };

    list.unshift(newItem);
    await safeSave(KEYS.people, list);

    return newItem;
  },

  update: async (person: Person) => {
    const list = await safeGet<Person>(KEYS.people);

    const idx = list.findIndex((p) => p.id === person.id);

    if (idx !== -1) {
      list[idx] = person;
      await safeSave(KEYS.people, list);
    }

    return person;
  },

  delete: async (id: string) => {
    const list = await safeGet<Person>(KEYS.people);
    await safeSave(
      KEYS.people,
      list.filter((p) => p.id !== id)
    );
  },
};

// ======================
// Tarefas
// ======================

export const taskStorage = {
  getAll: () => safeGet<Task>(KEYS.tasks),

  save: async (task: Omit<Task, "id">) => {
    const list = await safeGet<Task>(KEYS.tasks);

    const newItem: Task = {
      ...task,
      id: generateId(),
    };

    list.unshift(newItem);
    await safeSave(KEYS.tasks, list);

    return newItem;
  },

  update: async (task: Task) => {
    const list = await safeGet<Task>(KEYS.tasks);

    const idx = list.findIndex((t) => t.id === task.id);

    if (idx !== -1) {
      list[idx] = task;
      await safeSave(KEYS.tasks, list);
    }

    return task;
  },

  delete: async (id: string) => {
    const list = await safeGet<Task>(KEYS.tasks);
    await safeSave(
      KEYS.tasks,
      list.filter((t) => t.id !== id)
    );
  },
};

// ======================
// Estoque
// ======================

export const inventoryStorage = {
  getAll: () => safeGet<InventoryItem>(KEYS.inventory),

  save: async (item: Omit<InventoryItem, "id">) => {
    const list = await safeGet<InventoryItem>(KEYS.inventory);

    const newItem: InventoryItem = {
      ...item,
      id: generateId(),
    };

    list.unshift(newItem);
    await safeSave(KEYS.inventory, list);

    return newItem;
  },

  update: async (item: InventoryItem) => {
    const list = await safeGet<InventoryItem>(KEYS.inventory);

    const idx = list.findIndex((i) => i.id === item.id);

    if (idx !== -1) {
      list[idx] = item;
      await safeSave(KEYS.inventory, list);
    }

    return item;
  },

  delete: async (id: string) => {
    const list = await safeGet<InventoryItem>(KEYS.inventory);
    await safeSave(
      KEYS.inventory,
      list.filter((i) => i.id !== id)
    );
  },
};

// ======================
// Config Global
// ======================

export const configStorage = {
  get: async (): Promise<AppConfig | null> => {
    try {
      const data = await AsyncStorage.getItem(KEYS.config);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  save: async (config: AppConfig) => {
    await AsyncStorage.setItem(KEYS.config, JSON.stringify(config));
  },
};
