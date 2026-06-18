import { type SchemaTypeDefinition } from 'sanity'

import { modeloType } from './modeloType'
import { testimonioType } from './testimonioType'
import { siteConfigType } from './siteConfigType'
import { homePageType } from './homePageType'
import { configuradorPageType } from './configuradorPageType'
import { modelosPageType } from './modelosPageType'
import { quienesSomosType } from './quienesSomosType'
import { blockContentType } from './blockContentType'
import { categoryType } from './categoryType'
import { postType } from './postType'
import { authorType } from './authorType'

export const schema: { types: SchemaTypeDefinition[] } = {
  types: [
    // MOVARA core
    modeloType,
    testimonioType,
    siteConfigType,
    homePageType,
    configuradorPageType,
    modelosPageType,
    quienesSomosType,
    // Blog (reservado para futuro)
    postType,
    categoryType,
    authorType,
    blockContentType,
  ],
}
