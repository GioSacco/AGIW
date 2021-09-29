import deepmatcher as dm
import pandas as pd
import py_entitymatching as em
import numpy as np
import os
import ssl
import nltk
from numpy.random import RandomState

# Risolve un errore (SSL certificate) durante la lettura dei dati in locale effettuata da deepmatcher nel task relativo al processamento dei dati (dm.process)
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

# Path ai due dataset di input
path_A = os.path.join('.', 'A.csv')
path_B = os.path.join('.', 'B.csv')

# Per ciascun dataSet aggiungo la colonna id popolandola con l'index corrispondente a ciascuna row
datasetA = pd.read_csv(path_A)
datasetA["id"] = datasetA.index + 1
datasetA.to_csv(path_A, index=False)

datasetB = pd.read_csv(path_B)
datasetB["id"] = datasetB.index + 1
datasetB.to_csv(path_B, index=False)

# Leggo i dati dei due dataset
A = em.read_csv_metadata(path_A, key='id', low_memory=False)
B = em.read_csv_metadata(path_B, key='id', low_memory=False)

print('Numero di elementi in A: ' + str(len(A)))
print('Numero di elementi in B: ' + str(len(B)))
print('Numero di elementi del prodotto cartesiano A X B: ' + str(len(A)*len(B)))

# Creo un overlap blocker tramite Magellan e lo applico ai due dataset per reperire le coppie di tuple candidate. Questa operazione mi ritorna
# un dataframe contenente le coppie candidate. I parametri "l_out_attrs" and "r_out_attrs" indicano le colonne di A e B che dovranno essere incluse in K1.
# Il parametro overlap_size indica quanto i campi presenti nelle colonne 'name' negli elementi di ogni coppia
# esaminata possano differire per essere considerate simili e quindi essere aggiunte nella lista di quelle candidate
ob = em.OverlapBlocker()
K1 = ob.block_tables(A, B, 'name', 'name',
                    l_output_attrs=['scrape_id', 'name', 'description', 'picture_url', 'host_id', 'neighbourhood', 'latitude', 'longitude', 'property_type', 'room_type', 'accommodates', 'bathrooms', 'bedrooms', 'beds', 'price', 'minimum_nights', 'maximum_nights', 'number_of_reviews', 'review_scores_rating', 'reviews_per_month', 'index_col', 'id'], 
                    r_output_attrs=['scrape_id', 'name', 'description', 'picture_url', 'host_id', 'neighbourhood', 'latitude', 'longitude', 'property_type', 'room_type', 'accommodates', 'bathrooms', 'bedrooms', 'beds', 'price', 'minimum_nights', 'maximum_nights', 'number_of_reviews', 'review_scores_rating', 'reviews_per_month', 'index_col', 'id'],
                    overlap_size=1)

# Salvo il dataframe in un file CSV
path_K = os.path.join('.', 'temp', 'candidate.csv')
K1.to_csv(path_K, index=False)

# Estraggo dal dataframe delle coppie candidate unicamente 1000 coppie
S = em.sample_table(K1, 1000)
S.to_csv('./temp/candidate.csv', index=False)

# Aggiungo al dataset delle coppie candidate una colonna label che indichi, per ogni coppia, se effettivamente rappresentano la stessa entità (1) oppure no (0)
filterCandidate = pd.read_csv('./temp/candidate.csv')
filterCandidate['label'] = 0

for index, row in filterCandidate.iterrows():
    if (row['ltable_name'] == row['rtable_name']):
        filterCandidate.at[index,'label'] = 1

filterCandidate.to_csv('./temp/candidate.csv', index=False)

# Estraggo in un dataframe G il dataset delle coppie candidate a cui sono state applicate le etichette 'label'
G = em.read_csv_metadata('./temp/candidate.csv', 
                         key='_id',
                         ltable=A, rtable=B, 
                         fk_ltable='ltable_name', fk_rtable='rtable_name')
print('Number of labeled pairs:', len(G))

# Suddivido il dataset filterCandidate in 3 differenti dataset per l'addestramento, la validazione e il test
train, validate, test = \
              np.split(filterCandidate.sample(frac=1, random_state=42), 
                       [int(.6*len(filterCandidate)), int(.8*len(filterCandidate))])

train.to_csv('./temp/spilt_data/train.csv', index=False)
validate.to_csv('./temp/spilt_data/valid.csv', index=False)
test.to_csv('./temp/spilt_data/test.csv', index=False)

split_path = os.path.join('./temp/spilt_data')
dm.data.split(G, split_path, 'train.csv', 'valid.csv', 'test.csv',
              [3, 1, 1])


# Genero i dati di training dai file creati nel passo precedente.
# Il parametro use_magellan_convention indica che i dataset di training utilizzano
# nell'header la convenzione 'magellan' (l.., r.. in sostituzione di left_ , right_)
train, validation, test = dm.data.process(
    path=os.path.join('.', 'temp', 'spilt_data'),
    train='train.csv',
    validation='valid.csv',
    test='test.csv',
    use_magellan_convention=True)


# Creo il matchingModel
model = dm.MatchingModel(attr_summarizer='hybrid')


# Effettuo l'addestramento del modello tramite 10 epoche, con un batch size di 16. Il modello viene quindi valutato sulla base
# del miglior valore di F1 ottenuto sul validation set.
model.run_train(
    train,
    validation,
    epochs=10,
    batch_size=16,
    best_save_path='hybrid_model.pth',
    pos_neg_ratio=3)


# Effettua la validazione del modello sul test set.
model.run_eval(test)
