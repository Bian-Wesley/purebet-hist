# purebet-hist
## Went through every transaction ever involving the Purebet program to see the daily amount wagered since Purebet's launch. 
## Guide to this repository:
### vol.js: Searches the transaction history of Purebet, filters out the transactions where wagers are placed, uses efficient data structures to map day to volume wagered, writes to csv file.
### volumes.csv: records day and volume wagered on that day
### plot.py: uses pandas and matplotlib to plot the values in volumes.csv
### daily.png: plot of volumes over time
### cumulative.png: plt of cumulative volume wagered until a particular day
