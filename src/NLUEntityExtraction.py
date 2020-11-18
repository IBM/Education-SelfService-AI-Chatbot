#テスト
import sys

from dotenv import load_dotenv, find_dotenv
import os
import json
import itertools
import pandas as pd
from ibm_watson import NaturalLanguageUnderstandingV1
from ibm_cloud_sdk_core.authenticators import IAMAuthenticator
from ibm_watson.natural_language_understanding_v1 import (
    Features,
    CategoriesOptions,
    KeywordsOptions,
    ConceptsOptions,
)

# load the .env file containing your environment variables for the required
load_dotenv(find_dotenv())

"""
Initialize NLU Instance with Environment Varibles Stored in .env
"""

authenticator = IAMAuthenticator(os.environ.get('NATURAL_LANGUAGE_UNDERSTANDING_APIKEY'))

natural_language_understanding = NaturalLanguageUnderstandingV1(
    version="2019-07-12", authenticator=authenticator
)

natural_language_understanding.set_service_url(os.environ.get("NATURAL_LANGUAGE_UNDERSTANDING_URL"))

"""
INPUT: filepath to an input csv file 
OUTPUT: csv file that contains courses, descriptions, keywords, concepts and subjects
Notes:
- Make sure that your input file mirrors the formatting of the input file in 
./data/discovery-nlu/input/ElementarySchoolClasses.csv
"""
def extractEntities(input_filepath, output_filepath, course_level):
    df = pd.read_csv(input_filepath)
    (rows, _) = df.shape
    for idx in range(0, rows, 1):
        course_description = df["Description"][idx]
        nlu_categories = natural_language_understanding.analyze(
            text=course_description, features=Features(categories=CategoriesOptions())
        ).get_result()
        nlu_keywords = natural_language_understanding.analyze(
            text=course_description,
            features=Features(keywords=KeywordsOptions(sentiment=True, emotion=True)),
        ).get_result()
        nlu_concepts = natural_language_understanding.analyze(
            text=course_description, features=Features(concepts=ConceptsOptions())
        ).get_result()
        categories_list = list(map(lambda x: x["label"], nlu_categories["categories"]))
        keywords_list = list(map(lambda x: x["text"], nlu_keywords["keywords"]))
        concepts_list = list(map(lambda x: x["text"], nlu_concepts["concepts"]))
        categories_list_extracted = list(
            map(lambda x: x.split("/")[1:], categories_list)
        )
        categories_list_flattened = list(
            set(list(itertools.chain(*categories_list_extracted)))
        )
        # If there are not enough concepts add keywords to the list
        if len(concepts_list) < 3:
            concepts_list = concepts_list + keywords_list
        df["Concepts"][idx] = concepts_list
        df["Subject"][idx] = categories_list_flattened
        df["Level"][idx] = course_level
    df.to_csv(output_filepath, index = False)
    return df


# Sample Function Calls
extractEntities(
"../data/discovery-nlu/input/HighSchoolClasses.csv",
"../data/discovery-nlu/output/HighSchoolClasses_Analyzed.csv",
course_level="High School",
)

extractEntities(
"../data/discovery-nlu/input/ElementarySchoolClasses.csv",
"../data/discovery-nlu/output/ElementarySchoolClasses_Analyzed.csv",
course_level="Elementary School",
)
