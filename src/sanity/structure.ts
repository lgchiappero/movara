import type { StructureResolver } from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('MOVARA CMS')
    .items([
      S.listItem()
        .title('Modelos')
        .child(S.documentTypeList('modelo').title('Modelos')),

      S.listItem()
        .title('Testimonios')
        .child(S.documentTypeList('testimonio').title('Testimonios')),

      S.listItem()
        .title('Configuración del sitio')
        .child(
          S.document()
            .schemaType('siteConfig')
            .documentId('siteConfig')
            .title('Configuración del sitio'),
        ),

      S.listItem()
        .title('Configurador')
        .child(
          S.document()
            .schemaType('configuradorPage')
            .documentId('configuradorPage')
            .title('Configurador'),
        ),

      S.listItem()
        .title('Quiénes somos')
        .child(
          S.document()
            .schemaType('quienesSomos')
            .documentId('quienesSomos')
            .title('Quiénes somos'),
        ),

      S.listItem()
        .title('Página de Modelos')
        .child(
          S.document()
            .schemaType('modelosPage')
            .documentId('modelosPage')
            .title('Página de Modelos'),
        ),

      S.divider(),

      S.listItem()
        .title('Blog')
        .child(
          S.list()
            .title('Blog')
            .items([
              S.documentTypeListItem('post').title('Posts'),
              S.documentTypeListItem('category').title('Categorías'),
              S.documentTypeListItem('author').title('Autores'),
            ]),
        ),
    ])
