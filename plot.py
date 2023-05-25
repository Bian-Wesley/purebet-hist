import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("volumes.csv");
print(df.head())
#print the types
print(df.dtypes)
df["date"] = pd.to_datetime(df["date"])
plt.plot(df["date"], df["volume"])
plt.show()