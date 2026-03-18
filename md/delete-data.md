 The "Start Completely Fresh" Approach
If you don't mind losing everything (including custom tests, prices, and users you've added), you can wipe the database clean completely:

Ensure the PathoDesk app is fully closed.
Go to %appdata%\pathodesk.
Select and delete patholab.db (and any related files like patholab.db-wal or patholab.db-shm if they are there).
Launch PathoDesk. The app will automatically recreate a fresh SQLite database and run the standard default initializations.