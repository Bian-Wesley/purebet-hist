import pandas as pd
import matplotlib.pyplot as plt

df = pd.read_csv("volumes.csv");
print(df.head())
#print the types
print(df.dtypes)
df["date"] = pd.to_datetime(df["date"])
df.set_index(df["date"])
df = df.sort_index(ascending = False)
print(df.head())

#set x axis as day, y axis as Dollars wagered
#set plot title as Daily Volume at Purebet Since Launch
plt.plot(df["date"], df["volume"])
plt.suptitle("Daily Volume at Purebet Since Launch")
plt.title("In $")
plt.xlabel("Date")
plt.ylabel("Dollars Wagered")
plt.show()

#cumulative volume
df["cumulative_volume"] = df["volume"].cumsum()
plt.plot(df["date"], df["cumulative_volume"])
plt.suptitle("Cumulative Daily Volume at Purebet Since Launch")
plt.title("In $")
plt.xlabel("Date")
plt.ylabel("Dollars Wagered")
plt.show()
