import pandas as pd

URL = (
    "https://docs.google.com/spreadsheets/d/"
    "1-3Q3nVJhqO2ZEnyIZ2tGoJtwccb6fzmhi9ygp36l1eU/"
    "export?format=csv&gid=589958500"
)

df = pd.read_csv(URL)

print("=== columns ===")
for c in df.columns:
    print(c)

print("\n=== sample rows ===")
print(df.head(5))
