"use client";
// Inspired by react-hot-toast library
import * as React from "react";

const TOAST_LIMIT = 1;
const DEFAULT_DURATION = 4000; // 4s padrão
// Mantém compat com quem não passar duration:
const TOAST_REMOVE_DELAY_FALLBACK = 10000; // 10s de segurança

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
};

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

const toastTimeouts = new Map(); // id -> timeoutId

function scheduleRemove(toastId, delayMs) {
  // evita múltiplos timeouts para o mesmo id
  if (toastTimeouts.has(toastId)) return;

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: actionTypes.REMOVE_TOAST, toastId });
  }, Math.max(0, delayMs));

  toastTimeouts.set(toastId, timeout);
}

export const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      // agenda remoção com a duração definida no toast (ou fallback)
      if (toastId) {
        const t = state.toasts.find((x) => x.id === toastId);
        const delay = t?.duration ?? DEFAULT_DURATION;
        scheduleRemove(toastId, delay);
      } else {
        state.toasts.forEach((t) => {
          const delay = t?.duration ?? DEFAULT_DURATION;
          scheduleRemove(t.id, delay);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined ? { ...t, open: false } : t
        ),
      };
    }

    case actionTypes.REMOVE_TOAST: {
      if (action.toastId === undefined) {
        // limpar todos
        // cancela timeouts pendentes
        toastTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
        toastTimeouts.clear();
        return { ...state, toasts: [] };
      }
      // cancela o timeout desse toast (se existir)
      const timeoutId = toastTimeouts.get(action.toastId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        toastTimeouts.delete(action.toastId);
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
    }

    default:
      return state;
  }
};

const listeners = [];
let memoryState = { toasts: [] };

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

// API principal: cria um toast
function toast({ duration, ...props }) {
  const id = genId();

  const update = (next) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...next, id },
    });

  const dismiss = () =>
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      duration:
        typeof duration === "number"
          ? duration
          : props.open === false
          ? TOAST_REMOVE_DELAY_FALLBACK
          : DEFAULT_DURATION,
      onOpenChange: (open) => {
        if (!open) dismiss();
      },
    },
  });

  return { id, dismiss, update };
}

function useToast() {
  const [state, setState] = React.useState(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []); // registra apenas uma vez

  const dismiss = (toastId) =>
    dispatch({ type: actionTypes.DISMISS_TOAST, toastId });

  const dismissAll = () => dispatch({ type: actionTypes.DISMISS_TOAST });

  const updateById = (id, patch) =>
    dispatch({ type: actionTypes.UPDATE_TOAST, toast: { id, ...patch } });

  return {
    ...state,
    toast,
    dismiss,
    dismissAll,
    updateById,
  };
}

export { useToast, toast };
