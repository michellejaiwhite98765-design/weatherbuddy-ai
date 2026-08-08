import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api, getStoredToken, setStoredToken } from "./api";

export const login = createAsyncThunk("auth/login", async ({ email, password }, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/auth/login", { email, password });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || "Login failed");
  }
});

export const signup = createAsyncThunk("auth/signup", async ({ name, email, password }, { rejectWithValue }) => {
  try {
    const { data } = await api.post("/auth/signup", { name, email, password });
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || "Signup failed");
  }
});

export const fetchMe = createAsyncThunk("auth/fetchMe", async () => {
  const { data } = await api.get("/auth/me");
  return data;
});

export const updatePrefs = createAsyncThunk("auth/updatePrefs", async (patch, { rejectWithValue }) => {
  try {
    const { data } = await api.put("/auth/prefs", patch);
    return data.user;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || "Could not save preferences");
  }
});

const initialState = {
  token: getStoredToken(),
  user: null,
  status: "idle", // idle | loading | authenticated | anonymous | failed
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    logout(state) {
      setStoredToken(null);
      state.token = null;
      state.user = null;
      state.status = "anonymous";
      state.error = null;
    },
    setLocalUser(state, action) {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.fulfilled, (state, action) => {
        setStoredToken(action.payload.token);
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.status = "authenticated";
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(signup.fulfilled, (state, action) => {
        setStoredToken(action.payload.token);
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.status = "authenticated";
        state.error = null;
      })
      .addCase(signup.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.status = "authenticated";
      })
      .addCase(fetchMe.rejected, (state) => {
        setStoredToken(null);
        state.token = null;
        state.user = null;
        state.status = "anonymous";
      })
      .addCase(updatePrefs.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { logout, setLocalUser } = authSlice.actions;
export default authSlice.reducer;
