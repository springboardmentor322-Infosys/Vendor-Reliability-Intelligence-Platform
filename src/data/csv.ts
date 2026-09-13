import Papa from 'papaparse';

export async function loadCsv<T = Record<string, string>>(
  filename: string
): Promise<T[]> {
  const response = await fetch(`/data/${filename}`);

  if (!response.ok) {
    throw new Error(`Failed to load ${filename}`);
  }

  const text = await response.text();

  return new Promise((resolve, reject) => {
    Papa.parse<T>(text, {
      header: true,
      skipEmptyLines: true,

      complete: (results) => {
        resolve(results.data);
      },

      error: (error: Error) => {
        reject(error);
      },
    });
  });
}