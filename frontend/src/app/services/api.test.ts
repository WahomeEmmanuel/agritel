import { getFarmAdvice } from './api';

// Create a mock for global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('getFarmAdvice Service', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('successfully fetches advice from the backend', async () => {
    const mockResponse = {
      summary: "Planting season is here.",
      points: ["Clear land", "Add manure"],
      cost_estimate_per_acre_kes: 12000,
      warning: "Heavy rains expected",
      pro_tip: "Mulching helps"
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getFarmAdvice({
      last_message: "How to plant",
      context_history: [],
      county: "Nakuru",
      crop: "Maize"
    });

    expect(result.summary).toBe("Planting season is here.");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});