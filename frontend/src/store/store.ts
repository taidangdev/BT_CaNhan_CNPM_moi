import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import profileReducer from './profileSlice';
import cartReducer from './cartSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        profile: profileReducer,
        cart: cartReducer
    }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
