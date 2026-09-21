import zipfile
import io
import requests
import pandas as pd
import pyarrow.parquet as pq
from pathlib import Path
from tqdm.auto import tqdm
import json
from sklearn.preprocessing import MinMaxScaler
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from IPython.display import display
import numpy as np