import { gql, useQuery } from "@apollo/client";
import { useFormikContext } from "formik";
import React, { useEffect, useRef } from "react";
import * as models from "../models";
import { EntityRelationFieldsChart } from "./EntityRelationFieldsChart";
import { HorizontalRule } from "@amplication/design-system";
import "./RelatedEntityFieldField.scss";

const CLASS_NAME = "related-entity-field-field";

type Props = {
  entityDisplayName: string;
};

const RelatedEntityFieldField = ({ entityDisplayName }: Props) => {
  const formik = useFormikContext<models.EntityField>();

  const entityFieldRef: React.MutableRefObject<models.EntityField | undefined> =
    useRef(null);
  const { data } = useQuery<{ entity: models.Entity }>(
    GET_ENTITY_FIELD_BY_PERMANENT_ID,
    {
      variables: {
        entityId: formik.values.properties.relatedEntityId,
        fieldPermanentId: formik.values.properties.relatedFieldId,
      },
      skip:
        !formik.values.properties?.relatedEntityId ||
        !formik.values.properties?.relatedFieldId,
    }
  );

  useEffect(() => {
    if (!data) {
      entityFieldRef.current = null;
      return;
    }

    const relatedField =
      (data.entity?.fields &&
        data.entity.fields.length &&
        data.entity.fields[0]) ||
      undefined;

    entityFieldRef.current = relatedField;
  }, [data, formik.values]);

  return (
    <div className={CLASS_NAME}>
      {entityFieldRef.current && (
        <>
          <HorizontalRule />
          <EntityRelationFieldsChart
            fixInPlace={false}
            resourceId={data.entity.resourceId}
            entityId={data.entity.id}
            field={formik.values}
            entityName={entityDisplayName}
            relatedField={entityFieldRef.current}
            relatedEntityName={data.entity.displayName}
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            onSubmit={() => {}}
          />
        </>
      )}
    </div>
  );
};

export default RelatedEntityFieldField;

export const GET_ENTITY_FIELD_BY_PERMANENT_ID = gql`
  query GetEntityFieldByPermanentId(
    $entityId: String!
    $fieldPermanentId: String
  ) {
    entity(where: { id: $entityId }) {
      id
      displayName
      resourceId
      fields(where: { permanentId: { equals: $fieldPermanentId } }) {
        id
        permanentId
        displayName
        name
        properties
      }
    }
  }
`;
