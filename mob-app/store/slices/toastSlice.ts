import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type ToastType = 'error' | 'success' | 'info';

export interface ToastState {
  message: string | null;
  type: ToastType;
  visible: boolean;
}

const initialState: ToastState = {
  message: null,
  type: 'error',
  visible: false,
};

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    showToast: (state, action: PayloadAction<{ message: string; type?: ToastType }>) => {
      state.message = action.payload.message;
      state.type = action.payload.type ?? 'error';
      state.visible = true;
    },
    hideToast: (state) => {
      state.visible = false;
      state.message = null;
    },
  },
});

export const { showToast, hideToast } = toastSlice.actions;
export default toastSlice.reducer;
