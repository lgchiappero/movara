import type { StructureResolver } from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Habitatt CMS')
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
